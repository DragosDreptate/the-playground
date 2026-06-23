import type { Prisma } from "@prisma/client";
import { prisma } from "@/infrastructure/db/prisma";
import {
  coerceBlocklist,
  SIGN_IN_BLOCKLIST_KEY,
  type DynamicBlocklist,
} from "@/infrastructure/auth/dynamic-blocklist";
import { normalizeDomain } from "@/lib/email/disposable-domains";

// Ajoute des entrées à la blocklist dynamique (Edge Config), côté serveur.
// Réutilise la même mécanique que la CLI `scripts/blocklist-edit.ts`
// (read-merge-write via l'API Vercel Edge Config, upsert idempotent).
const DEFAULT_EDGE_CONFIG_ID = "ecfg_290ik5kuib6seqd7pz7hkoibuhaf";
const edgeConfigId = process.env.EDGE_CONFIG_ID ?? DEFAULT_EDGE_CONFIG_ID;
const teamQuery = process.env.VERCEL_TEAM_ID
  ? `?teamId=${process.env.VERCEL_TEAM_ID}`
  : "";
const base = `https://api.vercel.com/v1/edge-config/${edgeConfigId}`;

export type BlockTargets = {
  emails?: string[];
  oauthIds?: string[];
  domains?: string[];
};

/**
 * - `blocked` : écrit dans la blocklist prod.
 * - `skipped` : non écrit car hors production (guard symétrique avec sendSlack /
 *   safe-resend : l'Edge Config est unique/prod, on ne l'édite pas depuis
 *   local/preview pour éviter un blocage accidentel d'un vrai compte en test).
 * - `failed` : token manquant ou erreur d'écriture.
 */
export type BlockResult = "blocked" | "skipped" | "failed";

function mergeUnique(existing: string[], add: string[]): string[] {
  // Ignore les cibles vides/blanches (sinon on écrirait "" dans la blocklist).
  return Array.from(new Set([...existing, ...add.filter((s) => s.length > 0)]));
}

/**
 * Ajoute les cibles fournies à la blocklist (idempotent, dédupliqué).
 * Écriture en **production uniquement**. `VERCEL_TOKEN` requis.
 */
export async function addToBlocklist(
  targets: BlockTargets
): Promise<BlockResult> {
  if (process.env.VERCEL_ENV !== "production") {
    console.warn("[non-prod] Blocage ignoré (Edge Config = prod) :", targets);
    return "skipped";
  }
  const token = process.env.VERCEL_TOKEN;
  if (!token) return "failed";
  const authHeaders = { Authorization: `Bearer ${token}` };

  try {
    const getRes = await fetch(
      `${base}/item/${SIGN_IN_BLOCKLIST_KEY}${teamQuery}`,
      { headers: authHeaders, cache: "no-store" }
    );
    let current: DynamicBlocklist;
    if (getRes.status === 404) current = coerceBlocklist(undefined);
    else if (!getRes.ok) return "failed";
    else
      current = coerceBlocklist(
        ((await getRes.json()) as { value?: unknown }).value
      );

    const next: DynamicBlocklist = {
      emails: mergeUnique(
        current.emails,
        (targets.emails ?? []).map((e) => e.trim().toLowerCase())
      ),
      oauthIds: mergeUnique(
        current.oauthIds,
        (targets.oauthIds ?? []).map((o) => o.trim())
      ),
      domains: mergeUnique(
        current.domains,
        (targets.domains ?? []).map((d) => normalizeDomain(d))
      ),
    };

    const patchRes = await fetch(`${base}/items${teamQuery}`, {
      method: "PATCH",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          { operation: "upsert", key: SIGN_IN_BLOCKLIST_KEY, value: next },
        ],
      }),
    });
    return patchRes.ok ? "blocked" : "failed";
  } catch {
    return "failed";
  }
}

/**
 * Filtre Prisma des users visés par un blocage (email / oauthId / domaine).
 * Pur et testable. Renvoie `null` si aucune cible exploitable, pour éviter un
 * `deleteMany` sans `where` qui viderait toutes les sessions.
 */
export function buildBlockedUsersFilter(
  targets: BlockTargets
): Prisma.UserWhereInput | null {
  const or: Prisma.UserWhereInput[] = [];

  const emails = (targets.emails ?? []).filter((e) => e.length > 0);
  if (emails.length) or.push({ email: { in: emails } });

  const oauthIds = (targets.oauthIds ?? []).filter((o) => o.length > 0);
  if (oauthIds.length) {
    or.push({ accounts: { some: { providerAccountId: { in: oauthIds } } } });
  }

  for (const d of targets.domains ?? []) {
    const dom = normalizeDomain(d);
    // insensitive : un email stocké « X@Domain.COM » doit matcher « domain.com ».
    if (dom) or.push({ email: { endsWith: `@${dom}`, mode: "insensitive" } });
  }

  return or.length ? { OR: or } : null;
}

/**
 * Révoque (supprime) les sessions actives des comptes visés par un blocage.
 * Le blocage seul empêche de **se reconnecter** mais ne tue PAS une session DB
 * déjà ouverte (la blocklist n'est vérifiée qu'au sign-in) : sans ça, un
 * spammeur déjà connecté garde l'accès jusqu'à expiration. Renvoie le nombre de
 * sessions supprimées.
 */
export async function revokeSessionsForTargets(
  targets: BlockTargets
): Promise<number> {
  const where = buildBlockedUsersFilter(targets);
  if (!where) return 0;

  const users = await prisma.user.findMany({ where, select: { id: true } });
  if (!users.length) return 0;

  const { count } = await prisma.session.deleteMany({
    where: { userId: { in: users.map((u) => u.id) } },
  });
  return count;
}

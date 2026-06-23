import type { Prisma } from "@prisma/client";
import { prisma } from "@/infrastructure/db/prisma";
import {
  BASE_DELAY_MS,
  MAX_RETRIES,
  isTransientError,
  sleep,
} from "@/infrastructure/db/retry-policy";
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
 * Résultat d'une mutation de la blocklist (blocage OU déblocage) :
 * - `applied` : écrit dans la blocklist prod.
 * - `skipped` : non écrit car hors production (guard symétrique avec sendSlack /
 *   safe-resend : l'Edge Config est unique/prod, on ne l'édite pas depuis
 *   local/preview pour éviter de toucher la vraie blocklist en test).
 * - `failed` : token manquant ou erreur d'écriture.
 */
export type BlocklistWriteResult = "applied" | "skipped" | "failed";

function mergeUnique(existing: string[], add: string[]): string[] {
  // Ignore les cibles vides/blanches (sinon on écrirait "" dans la blocklist).
  return Array.from(new Set([...existing, ...add.filter((s) => s.length > 0)]));
}

/**
 * Scaffolding read-merge-write de la blocklist Edge Config, partagé par le
 * blocage et le déblocage. `transform` reçoit l'état courant et renvoie l'état
 * cible. Écriture en **production uniquement** (`VERCEL_TOKEN` requis).
 */
async function mutateBlocklist(
  transform: (current: DynamicBlocklist) => DynamicBlocklist
): Promise<BlocklistWriteResult> {
  if (process.env.VERCEL_ENV !== "production") {
    console.warn("[non-prod] Mutation blocklist ignorée (Edge Config = prod)");
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

    const patchRes = await fetch(`${base}/items${teamQuery}`, {
      method: "PATCH",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          {
            operation: "upsert",
            key: SIGN_IN_BLOCKLIST_KEY,
            value: transform(current),
          },
        ],
      }),
    });
    return patchRes.ok ? "applied" : "failed";
  } catch {
    return "failed";
  }
}

/**
 * Ajoute les cibles fournies à la blocklist (idempotent, dédupliqué).
 */
export async function addToBlocklist(
  targets: BlockTargets
): Promise<BlocklistWriteResult> {
  return mutateBlocklist((current) => ({
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
  }));
}

/**
 * Retire les cibles d'une blocklist (transformation pure, testable). Idempotent :
 * retirer une entrée absente laisse la liste inchangée. Comparaisons normalisées
 * (email lowercase, domaine via normalizeDomain) pour matcher quelle que soit la
 * casse stockée.
 */
export function removeTargetsFromBlocklist(
  current: DynamicBlocklist,
  targets: BlockTargets
): DynamicBlocklist {
  const emails = new Set(
    (targets.emails ?? []).map((e) => e.trim().toLowerCase())
  );
  const oauthIds = new Set((targets.oauthIds ?? []).map((o) => o.trim()));
  const domains = new Set(
    (targets.domains ?? []).map((d) => normalizeDomain(d)).filter(Boolean)
  );
  return {
    emails: current.emails.filter((e) => !emails.has(e.trim().toLowerCase())),
    oauthIds: current.oauthIds.filter((o) => !oauthIds.has(o.trim())),
    domains: current.domains.filter((d) => !domains.has(normalizeDomain(d))),
  };
}

/**
 * Retire les cibles fournies de la blocklist (action inverse du blocage).
 */
export async function removeFromBlocklist(
  targets: BlockTargets
): Promise<BlocklistWriteResult> {
  return mutateBlocklist((current) =>
    removeTargetsFromBlocklist(current, targets)
  );
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
    if (!dom) continue;
    // Miroir du suffix-walk de matchesDomainSuffix (qui bloque aussi les
    // sous-domaines au sign-in) : on couvre `@domain` ET `.domain` pour ne pas
    // laisser de session active à un user en `x@sub.domain`. insensitive : un
    // email stocké « X@Domain.COM » doit matcher « domain.com ».
    or.push({ email: { endsWith: `@${dom}`, mode: "insensitive" } });
    or.push({ email: { endsWith: `.${dom}`, mode: "insensitive" } });
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
  const userWhere = buildBlockedUsersFilter(targets);
  if (!userWhere) return 0;

  // Un seul aller-retour : on supprime les sessions via le filtre de relation
  // `user` (pas de findMany d'ids intermédiaire). C'est une ÉCRITURE, donc NON
  // couverte par le retry-policy du client (READ only) ; or une connexion Neon
  // « stale » peut la faire échouer d'un coup (cf. prisma.ts / spec neon).
  // On retente nous-mêmes sur erreur transitoire pour ne pas laisser une session
  // active à un compte qu'on vient de bloquer. Une erreur non transitoire (ou
  // après MAX_RETRIES) est PROPAGÉE : l'appelant doit savoir que la coupure a
  // échoué (pas de faux « bloqué » silencieux).
  for (let attempt = 0; ; attempt++) {
    try {
      const { count } = await prisma.session.deleteMany({
        where: { user: userWhere },
      });
      return count;
    } catch (error) {
      if (attempt >= MAX_RETRIES || !isTransientError(error)) throw error;
      await sleep(BASE_DELAY_MS * 2 ** attempt);
    }
  }
}

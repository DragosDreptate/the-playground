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

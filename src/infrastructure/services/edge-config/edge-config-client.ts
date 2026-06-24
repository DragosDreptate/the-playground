/**
 * Client d'écriture/lecture Edge Config via l'API REST Vercel.
 *
 * Le SDK `@vercel/edge-config` ne sait que LIRE (et sert un snapshot répliqué,
 * éventuellement consistant). Pour écrire, et pour relire la source de vérité
 * sans lag de propagation (indispensable à une dédup read-after-write), on passe
 * par l'API REST. Même mécanique que `audit/blocklist-admin.ts` et les scripts
 * `maintenance-toggle.ts` / `blocklist-edit.ts`.
 *
 * Écriture **production uniquement** (guard symétrique avec sendSlack /
 * safe-resend) : l'Edge Config est unique et partagé, on ne l'édite pas depuis
 * local/preview/staging pour ne pas polluer l'état prod.
 */
const DEFAULT_EDGE_CONFIG_ID = "ecfg_290ik5kuib6seqd7pz7hkoibuhaf";
const edgeConfigId = process.env.EDGE_CONFIG_ID ?? DEFAULT_EDGE_CONFIG_ID;
const teamQuery = process.env.VERCEL_TEAM_ID
  ? `?teamId=${process.env.VERCEL_TEAM_ID}`
  : "";
const base = `https://api.vercel.com/v1/edge-config/${edgeConfigId}`;

/**
 * Lit un item Edge Config (valeur fraîche via l'API REST). Renvoie `undefined`
 * si la clé est absente, le token manquant, ou en cas d'erreur — fail-soft :
 * l'appelant traite l'absence d'état comme « rien de connu ».
 */
export async function getEdgeConfigItem<T>(key: string): Promise<T | undefined> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) return undefined;
  try {
    const res = await fetch(`${base}/item/${key}${teamQuery}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return undefined; // 404 (clé absente) inclus
    return ((await res.json()) as { value?: T }).value;
  } catch {
    return undefined;
  }
}

/**
 * Résultat d'une écriture Edge Config :
 * - `applied` : upsert écrit en prod.
 * - `skipped` : hors production, écriture volontairement ignorée.
 * - `failed`  : token manquant ou erreur d'écriture.
 */
export type EdgeConfigWriteResult = "applied" | "skipped" | "failed";

/** Upsert idempotent d'un item Edge Config. Écriture prod uniquement. */
export async function upsertEdgeConfigItem(
  key: string,
  value: unknown
): Promise<EdgeConfigWriteResult> {
  if (process.env.VERCEL_ENV !== "production") return "skipped";
  const token = process.env.VERCEL_TOKEN;
  if (!token) return "failed";
  try {
    const res = await fetch(`${base}/items${teamQuery}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items: [{ operation: "upsert", key, value }] }),
    });
    return res.ok ? "applied" : "failed";
  } catch {
    return "failed";
  }
}

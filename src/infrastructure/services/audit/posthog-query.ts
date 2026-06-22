// Helper de query HogQL générique pour l'audit de compte. Il n'existait pas de
// fonction réutilisable (fetch-dashboard.ts est spécifique au dashboard), d'où
// ce petit utilitaire dédié. Fail-soft : renvoie [] si la clé manque ou en cas
// d'erreur (PostHog = best-effort, la DB reste la source de vérité).
const POSTHOG_BASE_URL = "https://eu.posthog.com";
const POSTHOG_PROJECT_ID = 134622;

export async function queryPostHog(hogql: string): Promise<unknown[]> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `${POSTHOG_BASE_URL}/api/projects/${POSTHOG_PROJECT_ID}/query/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({ query: { kind: "HogQLQuery", query: hogql } }),
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: unknown[] };
    return Array.isArray(data.results) ? data.results : [];
  } catch {
    return [];
  }
}

/**
 * `distinct_id` PostHog d'un event `sign_in_blocked`.
 *
 * - Si on a le cookie PostHog du navigateur, on relie le rejet à la person et au
 *   parcours réels (le `$pageview`/clic qui l'ont précédé).
 * - Sinon (bot, hit direct sur l'endpoint, client PostHog bloqué), on regroupe
 *   par DOMAINE : un scanner qui fait tourner les adresses ne crée qu'une person
 *   par domaine (même borne que le fingerprint Sentry, anti-explosion de
 *   cardinalité), et aucun email brut ne devient un identifiant.
 */
export function resolveBlockedSignInDistinctId(
  cookieDistinctId: string | null,
  emailDomain: string
): string {
  return cookieDistinctId ?? `blocked:${emailDomain}`;
}

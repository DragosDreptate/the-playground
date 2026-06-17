/**
 * Mode maintenance — helpers purs (aucune dépendance infra).
 *
 * La lecture du flag (Edge Config) se fait dans `src/middleware.ts` ; ce module
 * ne contient que les constantes partagées et la comparaison timing-safe du
 * token de bypass, pour rester testable en isolation totale.
 */

/** Paramètre d'URL qui active le bypass : `?maintenance_bypass=<token>`. */
export const MAINTENANCE_BYPASS_QUERY_PARAM = "maintenance_bypass";

/** Cookie posé après un bypass réussi, rejoué sur les requêtes suivantes. */
export const MAINTENANCE_BYPASS_COOKIE = "maintenance_bypass";

/** Route de la page statique servie pendant la maintenance. */
export const MAINTENANCE_PATH = "/maintenance";

/**
 * `Retry-After` (secondes) renvoyé avec le 503 — indique aux crawlers et aux
 * sondes uptime que l'indisponibilité est temporaire (1h).
 */
export const MAINTENANCE_RETRY_AFTER_SECONDS = 3600;

/**
 * Durée de vie du cookie de bypass (8h) — assez long pour traverser un incident
 * sans avoir à re-fournir le token à chaque navigation.
 */
export const MAINTENANCE_BYPASS_COOKIE_MAX_AGE = 60 * 60 * 8;

/**
 * Comparaison de chaînes à temps constant. Évite `node:crypto` pour s'exécuter
 * de façon identique quel que soit le runtime du middleware. Parcourt toujours
 * la longueur maximale des deux entrées, sans court-circuit sur la première
 * différence.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  // Une différence de longueur est un mismatch, mais on parcourt quand même
  // toute la longueur pour ne pas révéler où la comparaison s'arrête.
  let mismatch = a.length === b.length ? 0 : 1;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    // charCodeAt hors borne renvoie NaN, coercé à 0 par le XOR bitwise : la
    // longueur déjà comptabilisée dans `mismatch` couvre ce cas.
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Vrai uniquement si `provided` correspond au token attendu. Renvoie false dès
 * que l'une des deux valeurs est absente/vide : un secret mal configuré (vide)
 * ne doit jamais autoriser un bypass.
 */
export function isBypassTokenValid(
  provided: string | undefined | null,
  expected: string | undefined | null
): boolean {
  if (!provided || !expected) return false;
  return timingSafeEqual(provided, expected);
}

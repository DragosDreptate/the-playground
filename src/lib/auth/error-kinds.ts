export type AuthErrorKind = "expected_user_flow" | "unexpected";

export const AUTH_ERROR_VERIFICATION = "Verification";

const EXPECTED_AUTH_ERROR_CODES = new Set([
  AUTH_ERROR_VERIFICATION,
  "UnknownAction",
  "AccessDenied",
]);

// Codes Auth.js acceptés tels quels dans les tags/messages Sentry. Le param
// ?error= étant contrôlable par l'utilisateur, tout le reste est rangé sous
// "Unknown" pour borner la cardinalité (la valeur brute reste en extra).
const KNOWN_AUTH_ERROR_CODES = new Set([
  ...EXPECTED_AUTH_ERROR_CODES,
  "Configuration",
  "OAuthAccountNotLinked",
  "OAuthCallbackError",
  "OAuthSignInError",
  "Default",
]);

export function normalizeAuthErrorCode(code: string | null | undefined): string {
  if (!code) return "Unknown";
  const normalized = code.split(":")[0]?.trim() ?? "";
  return KNOWN_AUTH_ERROR_CODES.has(normalized) ? normalized : "Unknown";
}

/**
 * Range les codes d'erreur Auth.js en deux familles : ceux qu'on attend dans
 * les flows utilisateurs normaux (token expiré, prefetch scanner, refus OAuth)
 * et le reste, qui mérite l'attention. Toutes les erreurs sont captées dans
 * Sentry — la classification sert uniquement à filtrer/grouper sans masquer.
 */
export function classifyAuthError(code: string | null | undefined): AuthErrorKind {
  if (!code) return "unexpected";
  const normalized = code.split(":")[0]?.trim() ?? "";
  return EXPECTED_AUTH_ERROR_CODES.has(normalized) ? "expected_user_flow" : "unexpected";
}

// Reverse-map du hash @auth/core (ex. "#accessdenied") vers le code canonique
// ("AccessDenied"). Permet de récupérer le vrai code quand `error.name` est
// minifié dans le bundle de prod (ex. "v") et ne correspond plus au code Auth.js.
const CANONICAL_CODE_BY_HASH = new Map(
  [...KNOWN_AUTH_ERROR_CODES].map((code) => [code.toLowerCase(), code])
);

/**
 * Récupère le code d'erreur Auth.js canonique depuis le message `@auth/core`
 * (« … errors.authjs.dev#accessdenied » -> "AccessDenied").
 *
 * Robuste à la minification du bundle de prod, où `error.name` perd sa valeur
 * (« AccessDenied » devient « v »). Retourne `undefined` si le message ne porte
 * pas de hash connu — l'appelant retombe alors sur `error.name`.
 */
export function authErrorCodeFromMessage(
  message: string | null | undefined
): string | undefined {
  if (!message) return undefined;
  const hash = message.toLowerCase().match(/errors\.authjs\.dev#([a-z]+)/)?.[1];
  return hash ? CANONICAL_CODE_BY_HASH.get(hash) : undefined;
}

/**
 * Code d'erreur effectif pour une exception Auth.js : le code canonique tiré du
 * message `@auth/core` en priorité (robuste à la minification de `error.name` en
 * prod), avec repli sur `error.name` puis « Unknown ».
 *
 * Centralise le fallback pour qu'il soit testable directement (le callsite ne
 * réimplémente plus l'ordre de priorité). Le résultat doit encore passer par
 * `normalizeAuthErrorCode` avant d'alimenter un tag Sentry (cardinalité bornée).
 */
export function resolveAuthErrorCode(
  error: { name?: string | null; message?: string | null } | null | undefined
): string {
  return authErrorCodeFromMessage(error?.message) ?? error?.name ?? "Unknown";
}

/**
 * Détecte si un message d'exception correspond à un rejet d'authentification
 * ATTENDU levé par `@auth/core` (ex. « AccessDenied. Read more at
 * https://errors.authjs.dev#accessdenied »).
 *
 * Sert au `beforeSend` de Sentry à droper l'exception error-level auto-captée
 * par le SDK sur les routes `/api/auth/*` : ces refus (blocklist, token expiré)
 * sont déjà observés via le `captureMessage` warning de la page `/auth/error`.
 * On supprime le doublon error-level, pas l'observabilité.
 */
export function isExpectedAuthRejectionMessage(
  message: string | null | undefined
): boolean {
  const code = authErrorCodeFromMessage(message);
  return code !== undefined && classifyAuthError(code) === "expected_user_flow";
}

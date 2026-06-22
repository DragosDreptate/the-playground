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

/** Retire l'info après le `:` d'un code Auth.js (« Verification: token expired »). */
function stripCodePrefix(code: string): string {
  return code.split(":")[0]?.trim() ?? "";
}

export function normalizeAuthErrorCode(code: string | null | undefined): string {
  if (!code) return "Unknown";
  const normalized = stripCodePrefix(code);
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
  return EXPECTED_AUTH_ERROR_CODES.has(stripCodePrefix(code))
    ? "expected_user_flow"
    : "unexpected";
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
  if (!hash) return undefined;
  // Code canonique si connu (« accessdenied » -> « AccessDenied »), sinon le
  // hash brut : il identifie quand même précisément l'erreur @auth/core (ex.
  // « adaptererror » = panne DB) et reste borné au set fini du framework. Sans
  // ça, ces pannes infra retombaient sur error.name minifié puis « Unknown ».
  return CANONICAL_CODE_BY_HASH.get(hash) ?? hash;
}

/**
 * Code d'erreur effectif pour une exception Auth.js : le code canonique tiré du
 * message `@auth/core` en priorité (robuste à la minification de `error.name` en
 * prod), avec repli sur `error.name` puis « Unknown ».
 *
 * Centralise le fallback pour qu'il soit testable directement (le callsite ne
 * réimplémente plus l'ordre de priorité). Le résultat est DÉJÀ borné (code
 * @auth/core du set fini, ou error.name normalisé) : pas de re-normalisation.
 */
export function resolveAuthErrorCode(
  error: { name?: string | null; message?: string | null } | null | undefined
): string {
  // Code du message @auth/core en priorité (fiable, borné). À défaut, on retombe
  // sur `error.name` en le NORMALISANT : minifié en prod (« v ») ou nom arbitraire
  // d'une exception non-@auth/core, il retombe sous « Unknown » (cardinalité bornée).
  return (
    authErrorCodeFromMessage(error?.message) ??
    normalizeAuthErrorCode(error?.name)
  );
}

/**
 * Codes dont l'exception auto-captée (SDK ou hook logger.error) est TOUJOURS un
 * doublon d'une capture délibérée portant l'identité (`reportRejectedSignIn`),
 * donc à droper même si taggée `context: auth`.
 *
 * `AccessDenied` : seul moyen pour `@auth/core` de signaler un refus du callback
 * signIn (`return false`), et nos deux seuls `return false` (blocklist + domaine
 * jetable) journalisent l'identité via `reportRejectedSignIn`. Source unique de
 * vérité ici plutôt qu'un littéral disséminé dans le `beforeSend`.
 */
const ALWAYS_DUPLICATE_REJECTION_CODES = new Set(["AccessDenied"]);

/** Le code (issu de `authErrorCodeFromMessage`) est-il un doublon à toujours droper ? */
export function isAlwaysDuplicateRejectionCode(
  code: string | null | undefined
): boolean {
  return code !== undefined && code !== null && ALWAYS_DUPLICATE_REJECTION_CODES.has(code);
}

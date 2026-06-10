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

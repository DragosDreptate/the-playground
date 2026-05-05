export type AuthErrorKind = "expected_user_flow" | "unexpected";

export const AUTH_ERROR_VERIFICATION = "Verification";

const EXPECTED_AUTH_ERROR_CODES = new Set([
  AUTH_ERROR_VERIFICATION,
  "UnknownAction",
  "AccessDenied",
]);

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

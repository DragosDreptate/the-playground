export type SignInErrorKey =
  | "OAuthAccountNotLinked"
  | "OAuthCallbackError"
  | "OAuthSignInError"
  | "AccessDenied"
  | "Default";

const KNOWN_KEYS = new Set<SignInErrorKey>([
  "OAuthAccountNotLinked",
  "OAuthCallbackError",
  "OAuthSignInError",
  "AccessDenied",
]);

/**
 * Mappe un code d'erreur Auth.js (query param `error` sur /auth/sign-in) à une
 * clé i18n stable du namespace `Auth.signIn.errors`. Les codes inconnus tombent
 * sur `Default` pour ne jamais laisser l'utilisateur sans feedback.
 */
export function mapSignInErrorToKey(
  code: string | null | undefined
): SignInErrorKey {
  if (!code) return "Default";
  return KNOWN_KEYS.has(code as SignInErrorKey)
    ? (code as SignInErrorKey)
    : "Default";
}

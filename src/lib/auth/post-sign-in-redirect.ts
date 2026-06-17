/**
 * Construit la cible de redirection post-connexion : la page setup, qui finalise
 * l'onboarding puis renvoie l'utilisateur sur sa page d'origine.
 *
 * Deux invariants encodés ici :
 *
 *   1. Le préfixe `/${locale}/` du segment `dashboard/profile/setup` est
 *      TOUJOURS présent. La langue de l'email magic link est déduite du premier
 *      segment de ce path (cf. `detectLocaleForMagicLink`). Sans préfixe, tous
 *      les magic links partiraient en langue par défaut.
 *
 *   2. Le `callbackUrl` d'origine (événement, communauté...) est porté dans la
 *      query, pas seulement dans le cookie `auth-callback-url`. Le cookie ne
 *      survit pas à un changement de navigateur (webview LinkedIn/Instagram ->
 *      navigateur système) : le lien magic s'ouvre dans Safari/Chrome alors que
 *      le cookie a été posé dans la webview. La query, elle, voyage avec le
 *      lien et permet à la page setup de retrouver la destination.
 */
export function buildSetupRedirectPath(locale: string, callbackUrl?: string): string {
  const base = `/${locale}/dashboard/profile/setup`;
  return callbackUrl
    ? `${base}?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : base;
}

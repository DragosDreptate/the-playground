/**
 * Onboarding routing guards — pure functions.
 *
 * These encode the redirect invariants for the onboarding flow.
 * The key architectural rule: a non-onboarded user MUST be able to
 * reach the setup page without triggering another redirect (no loop).
 */

type OnboardingUser = {
  id: string;
  onboardingCompleted: boolean;
} | null | undefined;

/**
 * Should the user be redirected away from a protected dashboard page
 * to the onboarding setup page?
 *
 * Used by the (main) route group layout guard.
 */
export function shouldRedirectToSetup(user: OnboardingUser): boolean {
  return !!user && !user.onboardingCompleted;
}

/**
 * Should the user be redirected away from the setup page
 * (because they already completed onboarding)?
 *
 * Used by the setup page itself.
 */
export function shouldRedirectFromSetup(user: OnboardingUser): boolean {
  return !!user && user.onboardingCompleted;
}

/**
 * Construit l'URL `/dashboard/profile/setup` avec un `callbackUrl` pointant
 * vers la page courante (chemin + query). Appelée côté client quand une
 * server action publique renvoie `code: "ONBOARDING_REQUIRED"` — le user a
 * une session mais n'a pas finalisé son profil.
 *
 * Le routeur i18n (`@/i18n/navigation`) ajoutera le préfixe de locale.
 */
export function buildOnboardingSetupUrl(): string {
  const callbackUrl = `${window.location.pathname}${window.location.search}`;
  return `/dashboard/profile/setup?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

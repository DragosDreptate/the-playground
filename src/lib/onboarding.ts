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

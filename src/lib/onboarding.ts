// Invariant : un user non onboardé DOIT pouvoir atteindre /setup sans redirect (pas de boucle).

type OnboardingUser = {
  id: string;
  onboardingCompleted: boolean;
} | null | undefined;

export function shouldRedirectToSetup(user: OnboardingUser): boolean {
  return !!user && !user.onboardingCompleted;
}

export function shouldRedirectFromSetup(user: OnboardingUser): boolean {
  return !!user && user.onboardingCompleted;
}

/**
 * Construit l'URL `/dashboard/profile/setup` avec un `callbackUrl` vers la
 * page courante. Le router i18n ajoute le préfixe de locale au push.
 */
export function buildOnboardingSetupUrl(): string {
  const callbackUrl = `${window.location.pathname}${window.location.search}`;
  const params = new URLSearchParams({ callbackUrl });
  return `/dashboard/profile/setup?${params}`;
}

/**
 * Si le `result` d'une server action publique signale que l'utilisateur n'a
 * pas finalisé son onboarding, redirige vers la page setup. Retourne `true`
 * dans ce cas pour permettre au caller de court-circuiter sa gestion d'erreur.
 */
export function handleOnboardingRequired(
  result: { success: true } | { success: false; code: string },
  router: { push: (url: string) => void },
): boolean {
  if (result.success || result.code !== "ONBOARDING_REQUIRED") return false;
  router.push(buildOnboardingSetupUrl());
  return true;
}

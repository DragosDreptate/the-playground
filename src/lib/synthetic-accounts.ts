/**
 * Comptes SYNTHÉTIQUES : test, démo, et jeu de données E2E.
 *
 * Source unique de vérité. La liste était auparavant recopiée dans quatre
 * fichiers (garde d'envoi Resend, service email, cron d'onboarding, statistiques
 * admin) : ajouter un domaine obligeait à les retrouver tous, et en oublier un
 * seul suffisait à envoyer de vrais emails ou à fausser les statistiques.
 *
 * ⚠️ Ces domaines ne doivent JAMAIS recevoir d'email réel, et ne doivent jamais
 * être comptés comme de vrais utilisateurs.
 */

/** Données de test, seedées en dev comme en prod (`db:seed-test-data[:prod]`). */
export const TEST_EMAIL_SUFFIX = "@test.playground";

/** Vitrine publique, injectée en production (`db:seed-demo-data:prod`). */
export const DEMO_EMAIL_SUFFIX = "@demo.playground";

/**
 * Jeu de données de la suite E2E, produit par le seul `globalSetup` Playwright.
 * Jamais poussé en production.
 *
 * Existe parce que les données `@test.playground` sont masquées de l'Explorer
 * (`explorer-filters.ts`) : aucune communauté de test ne pouvait y apparaître,
 * et les tests de la page Découvrir se rabattaient en silence sur les données
 * héritées de la base de développement.
 */
export const E2E_EMAIL_SUFFIX = "@e2e.playground";

export const SYNTHETIC_EMAIL_SUFFIXES = [
  TEST_EMAIL_SUFFIX,
  DEMO_EMAIL_SUFFIX,
  E2E_EMAIL_SUFFIX,
] as const;

/** `true` si l'adresse appartient à un compte synthétique (test, démo ou E2E). */
export function isSyntheticEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return SYNTHETIC_EMAIL_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

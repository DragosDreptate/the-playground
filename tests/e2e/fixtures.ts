/**
 * Constantes E2E — slugs déterministes et chemins d'auth
 *
 * Ces constantes sont le miroir exact du seed script (db-seed-test-data.ts).
 * Toute modification dans le seed doit se refléter ici.
 */

// ── Slugs ─────────────────────────────────────────────────────────────────────

export const SLUGS = {
  /** Moment PUBLISHED avec places disponibles (60 places, ~4 inscrits) */
  PUBLISHED_MOMENT: "test-meetup-ia-creativite",
  /** Moment PAST avec commentaires */
  PAST_MOMENT: "test-soiree-js-pizza",
  /** Moment CANCELLED — doit retourner 404 */
  CANCELLED_MOMENT: "test-webinaire-annule",
  /** Moment PUBLISHED complet (capacity=3, 3 REGISTERED + 1 WAITLISTED) */
  FULL_MOMENT: "test-atelier-complet",
  /** Circle auquel appartient le Host (paris-creative-tech) */
  CIRCLE: "paris-creative-tech",
  /** Circle public pour les tests Explorer (yoga-montmartre) */
  PUBLIC_CIRCLE: "yoga-montmartre",
} as const;

// ── Chemins auth (générés par globalSetup) ────────────────────────────────────

export const AUTH = {
  /** Session du Host (host@test.playground) — onboardingCompleted=true */
  HOST: "tests/e2e/.auth/host.json",
  /** Session du Player1 (player1@test.playground) — inscrit à PUBLISHED_MOMENT */
  PLAYER: "tests/e2e/.auth/player.json",
  /** Session du Player3 (player3@test.playground) — WAITLISTED sur FULL_MOMENT */
  PLAYER3: "tests/e2e/.auth/player3.json",
  /** Session utilisateur non onboardé (onboarding-test@test.playground) */
  ONBOARDING: "tests/e2e/.auth/onboarding.json",
} as const;

// ── Emails des utilisateurs de test ───────────────────────────────────────────

export const TEST_USERS = {
  HOST: "host@test.playground",
  PLAYER: "player1@test.playground",
  PLAYER3: "player3@test.playground",
  ONBOARDING: "onboarding-test@test.playground",
} as const;

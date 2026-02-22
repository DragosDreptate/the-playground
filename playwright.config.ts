import { defineConfig, devices } from "@playwright/test";

/**
 * Config Playwright principale — tests E2E fonctionnels
 * Lancer avec : pnpm test:e2e
 *
 * Prérequis :
 *   - pnpm dev en cours (ou BASE_URL pointant vers un env déployé)
 *
 * Variables d'env optionnelles :
 *   BASE_URL                      URL de base (défaut : http://localhost:3000)
 *   E2E_AUTH_STORAGE_STATE        Session JSON d'un user ayant complété l'onboarding
 *   E2E_ONBOARDING_STORAGE_STATE  Session JSON d'un user avec onboardingCompleted=false
 *   E2E_TEST_MOMENT_SLUG          Slug d'un Moment public existant pour tests
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  webServer: {
    command: "pnpm dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

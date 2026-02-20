import { defineConfig, devices } from "@playwright/test";

/**
 * Config Playwright dédiée aux tests mobile.
 * Lancer avec : pnpm test:mobile
 *
 * Prérequis :
 *   - pnpm dev en cours (ou BASE_URL pointant vers un env déployé)
 *   - Pour les tests authentifiés : MOBILE_TEST_STORAGE_STATE (voir README ci-dessous)
 *
 * Variables d'env optionnelles :
 *   BASE_URL            URL de base (défaut : http://localhost:3000)
 *   MOBILE_TEST_MOMENT_SLUG  Slug d'un Moment public existant (ex: "mon-moment-test")
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/mobile",
  timeout: 30_000,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report-mobile", open: "never" }]],

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
    // iPhone SE — le plus petit écran courant (375px)
    {
      name: "iPhone SE",
      use: { ...devices["iPhone SE"] },
    },
    // iPhone 14 Pro — écran courant (393px)
    {
      name: "iPhone 14 Pro",
      use: { ...devices["iPhone 14 Pro"] },
    },
    // Galaxy S9+ — Android courant (412px)
    {
      name: "Galaxy S9+",
      use: { ...devices["Galaxy S9+"] },
    },
  ],
});

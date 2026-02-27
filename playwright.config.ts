import { defineConfig, devices } from "@playwright/test";

/**
 * Config Playwright principale — tests E2E fonctionnels
 * Lancer avec : pnpm test:e2e
 *
 * Prérequis :
 *   - pnpm dev en cours (ou BASE_URL pointant vers un env déployé)
 *
 * Variables d'env :
 *   BASE_URL  URL de base (défaut : http://localhost:3000)
 *
 * Le globalSetup génère automatiquement les storage states d'auth
 * et seed les données de test nécessaires.
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  globalSetup: "./tests/e2e/global-setup.ts",

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

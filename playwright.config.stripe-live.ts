import { defineConfig, devices } from "@playwright/test";

/**
 * Parcours de paiement réel contre Stripe en mode test, sur Chromium et WebKit.
 * Hors CI : exige des clés de test, un compte connecté actif et le relais des webhooks.
 *
 * 1. stripe listen --forward-connect-to localhost:3000/api/stripe/webhook
 * 2. STRIPE_WEBHOOK_SECRET=<secret affiché par listen> PORT=3000 pnpm dev
 * 3. STRIPE_E2E_ACCOUNT=acct_... pnpm exec playwright test --config playwright.config.stripe-live.ts
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "stripe-live.spec.ts",
  timeout: 120_000,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    locale: "fr-FR",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});

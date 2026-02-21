import { test, expect } from "@playwright/test";

/**
 * Tests E2E — Authentification
 *
 * Couvre :
 *   - Affichage de la page de connexion
 *   - Formulaire magic link (email)
 *   - Redirection après connexion
 *   - Page de vérification envoyée
 *
 * Prérequis : serveur Next.js en cours (BASE_URL)
 */

test.describe("Authentification — page de connexion", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/fr/auth/sign-in");
  });

  test("should display the sign-in page with an email input", async ({ page }) => {
    await expect(page.locator("input[type='email']")).toBeVisible();
  });

  test("should display a submit button for magic link", async ({ page }) => {
    const submitButton = page.locator("button[type='submit']");
    await expect(submitButton).toBeVisible();
  });

  test("should show an error when submitting an invalid email", async ({ page }) => {
    await page.fill("input[type='email']", "not-an-email");
    await page.locator("button[type='submit']").click();
    // Browser native validation or custom error
    const emailInput = page.locator("input[type='email']");
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test("should redirect to verify-request page after submitting a valid email", async ({ page }) => {
    await page.fill("input[type='email']", "test@example.com");
    await page.locator("button[type='submit']").click();
    await expect(page).toHaveURL(/\/auth\/verify-request/, { timeout: 10_000 });
  });
});

test.describe("Authentification — accès non authentifié", () => {
  test("should redirect unauthenticated user from /dashboard to sign-in", async ({ page }) => {
    await page.goto("/fr/dashboard");
    await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: 10_000 });
  });

  test("should allow access to public Moment page without authentication", async ({ page }) => {
    // A Moment page is public — no redirect to sign-in
    const momentSlug = process.env.E2E_TEST_MOMENT_SLUG ?? "test-moment";
    const response = await page.goto(`/fr/m/${momentSlug}`);
    // Either the page loads (200) or returns 404 — but never redirects to auth
    expect(response?.status()).not.toBe(302);
    await expect(page).not.toHaveURL(/\/auth\/sign-in/);
  });
});

import { test, expect } from "@playwright/test";
import { AUTH } from "./fixtures";

/**
 * Tests E2E — Isolation du flux d'onboarding
 *
 * Vérifie que la page /dashboard/profile/setup est totalement isolée :
 *   - Pas de footer avec liens navigables
 *   - Pas de liens de navigation (Explorer, Dashboard)
 *   - Logo non cliquable (pas une balise <a>)
 *   - Un utilisateur non onboardé redirigé vers setup depuis /dashboard
 *   - Un utilisateur onboardé redirigé hors de setup
 */

// ─── Accès non authentifié ───────────────────────────────────────────────────

test.describe("Onboarding — accès non authentifié", () => {
  test("should redirect unauthenticated user from setup page to sign-in", async ({ page }) => {
    await page.goto("/fr/dashboard/profile/setup");
    await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: 10_000 });
  });
});

// ─── Isolation layout (user non onboardé) ────────────────────────────────────

test.describe("Onboarding — isolation layout (user non onboardé)", () => {
  test.use({ storageState: AUTH.ONBOARDING });

  test("should display the setup page without a footer", async ({ page }) => {
    await page.goto("/fr/dashboard/profile/setup");
    await expect(page.locator("footer")).not.toBeAttached();
  });

  test("should not have navigation links on the setup page", async ({ page }) => {
    await page.goto("/fr/dashboard/profile/setup");
    await expect(page.locator(`header a[href*="/explorer"]`)).not.toBeAttached();
    await expect(page.locator(`header a[href*="/dashboard"]`)).not.toBeAttached();
  });

  test("should display the logo as a non-clickable element (not a link)", async ({ page }) => {
    await page.goto("/fr/dashboard/profile/setup");
    const logoAsLink = page.locator("header a").filter({ hasText: "The Playground" });
    await expect(logoAsLink).not.toBeAttached();
  });

  test("should redirect non-onboarded user from /dashboard to setup page", async ({ page }) => {
    await page.goto("/fr/dashboard");
    await expect(page).toHaveURL(/\/dashboard\/profile\/setup/, { timeout: 10_000 });
  });

  test("should show the profile setup form on the setup page", async ({ page }) => {
    await page.goto("/fr/dashboard/profile/setup");
    await expect(page.locator("input[name='firstName'], input[name='lastName']").first()).toBeVisible();
  });
});

// ─── Redirection user déjà onboardé ──────────────────────────────────────────

test.describe("Onboarding — redirection user déjà onboardé", () => {
  test.use({ storageState: AUTH.HOST });

  test("should redirect onboarded user away from setup page to dashboard", async ({ page }) => {
    await page.goto("/fr/dashboard/profile/setup");
    // La redirection peut inclure ou non le préfixe de locale
    await expect(page).toHaveURL(/\/dashboard(?!\/profile\/setup)/, { timeout: 10_000 });
  });
});

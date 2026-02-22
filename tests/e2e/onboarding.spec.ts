import { test, expect } from "@playwright/test";

/**
 * Tests E2E — Isolation du flux d'onboarding
 *
 * Vérifie que la page /dashboard/profile/setup est totalement isolée :
 *   - Pas de footer avec liens navigables
 *   - Pas de liens de navigation (Explorer, Dashboard)
 *   - Logo non cliquable (pas une balise <a>)
 *   - Un utilisateur non onboardé redirigé vers setup depuis /dashboard
 *   - Un utilisateur onboardé redirigé hors de setup
 *
 * Prérequis :
 *   - Serveur Next.js en cours (BASE_URL)
 *   - E2E_ONBOARDING_STORAGE_STATE : fichier JSON de session Playwright
 *     avec un utilisateur ayant onboardingCompleted = false
 *   - E2E_AUTH_STORAGE_STATE : fichier JSON de session Playwright
 *     avec un utilisateur ayant onboardingCompleted = true
 *
 * Pour générer E2E_ONBOARDING_STORAGE_STATE :
 *   1. Créer un utilisateur test avec onboardingCompleted = false en DB
 *   2. Utiliser l'endpoint de dev : GET /api/dev/impersonate?email=<email>
 *   3. Capturer le storage state Playwright
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
  test.skip(
    !process.env.E2E_ONBOARDING_STORAGE_STATE,
    "E2E_ONBOARDING_STORAGE_STATE non défini — configurer avec un user ayant onboardingCompleted=false"
  );

  test.use({
    storageState: process.env.E2E_ONBOARDING_STORAGE_STATE ?? "",
  });

  test("should display the setup page without a footer", async ({ page }) => {
    await page.goto("/fr/dashboard/profile/setup");
    // Le footer ne doit pas être rendu sur la page de setup (layout isolé)
    await expect(page.locator("footer")).not.toBeAttached();
  });

  test("should not have navigation links on the setup page", async ({ page }) => {
    await page.goto("/fr/dashboard/profile/setup");
    // Pas de lien vers Explorer ou Dashboard dans le header
    await expect(page.locator(`header a[href*="/explorer"]`)).not.toBeAttached();
    await expect(page.locator(`header a[href*="/dashboard"]`)).not.toBeAttached();
  });

  test("should display the logo as a non-clickable element (not a link)", async ({ page }) => {
    await page.goto("/fr/dashboard/profile/setup");
    // Le logo "The Playground" dans le header doit être un élément non-lien
    // On vérifie qu'il n'y a pas de <a> dans le header contenant le texte du logo
    const logoAsLink = page.locator("header a").filter({ hasText: "The Playground" });
    await expect(logoAsLink).not.toBeAttached();
  });

  test("should redirect non-onboarded user from /dashboard to setup page", async ({ page }) => {
    await page.goto("/fr/dashboard");
    await expect(page).toHaveURL(/\/dashboard\/profile\/setup/, { timeout: 10_000 });
  });

  test("should show the profile setup form on the setup page", async ({ page }) => {
    await page.goto("/fr/dashboard/profile/setup");
    // Le formulaire de configuration du profil doit être visible
    await expect(page.locator("input[name='firstName'], input[name='lastName']").first()).toBeVisible();
  });
});

// ─── Redirection user déjà onboardé ──────────────────────────────────────────

test.describe("Onboarding — redirection user déjà onboardé", () => {
  test.skip(
    !process.env.E2E_AUTH_STORAGE_STATE,
    "E2E_AUTH_STORAGE_STATE non défini"
  );

  test.use({
    storageState: process.env.E2E_AUTH_STORAGE_STATE ?? "",
  });

  test("should redirect onboarded user away from setup page to dashboard", async ({ page }) => {
    await page.goto("/fr/dashboard/profile/setup");
    // Un user onboardé qui tente d'accéder au setup est renvoyé au dashboard
    await expect(page).toHaveURL(/\/fr\/dashboard(?!\/profile\/setup)/, { timeout: 10_000 });
  });
});

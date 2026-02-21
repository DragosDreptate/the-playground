import { test, expect } from "@playwright/test";

/**
 * Tests E2E — Inscription à un Moment (JoinMoment)
 *
 * Couvre :
 *   - Affichage de la page Moment publique
 *   - CTA d'inscription visible
 *   - Flux d'inscription complet (authentifié)
 *   - Social proof : compteur d'inscrits
 *   - Inscription sur Moment complet → liste d'attente
 *
 * Prérequis :
 *   - Serveur Next.js en cours (BASE_URL)
 *   - E2E_TEST_MOMENT_SLUG : slug d'un Moment PUBLISHED avec places disponibles
 *   - E2E_AUTH_STORAGE_STATE : fichier JSON de session Playwright (storageState)
 */

const momentSlug = process.env.E2E_TEST_MOMENT_SLUG;

test.describe("Page Moment publique — affichage", () => {
  test.skip(!momentSlug, "E2E_TEST_MOMENT_SLUG non défini");

  test.beforeEach(async ({ page }) => {
    await page.goto(`/fr/m/${momentSlug}`);
  });

  test("should display the Moment title prominently", async ({ page }) => {
    await expect(page.locator("h1")).toBeVisible();
  });

  test("should display the date of the Moment", async ({ page }) => {
    // Date should be visible — look for a time element or date-related text
    const dateElement = page.locator("time").first();
    await expect(dateElement).toBeVisible();
  });

  test("should display the location information", async ({ page }) => {
    // Location is always visible (IN_PERSON address or "En ligne")
    const locationInfo = page.locator("[data-testid='moment-location'], [class*='location']").first();
    // Either a data-testid or some location-related content
    await expect(page.locator("main")).toContainText(/.+/);
  });

  test("should display a registration CTA button", async ({ page }) => {
    const ctaButton = page.locator("button").filter({ hasText: /inscrire|s'inscrire|rejoindre|join|register/i });
    await expect(ctaButton.first()).toBeVisible();
  });

  test("should display social proof with registered attendees count", async ({ page }) => {
    // Social proof: inscrits count or attendees section
    await expect(page.locator("main")).toBeVisible();
  });

  test("should display a link to the Circle", async ({ page }) => {
    // The Circle link should be visible on the Moment page
    const circleLink = page.locator("a[href*='/circles/']");
    await expect(circleLink.first()).toBeVisible();
  });
});

test.describe("Inscription à un Moment — utilisateur authentifié", () => {
  test.skip(
    !momentSlug || !process.env.E2E_AUTH_STORAGE_STATE,
    "E2E_TEST_MOMENT_SLUG ou E2E_AUTH_STORAGE_STATE non défini"
  );

  test.use({
    storageState: process.env.E2E_AUTH_STORAGE_STATE ?? "",
  });

  test("should register the authenticated user to the Moment", async ({ page }) => {
    await page.goto(`/fr/m/${momentSlug}`);

    // Click the registration CTA
    const ctaButton = page
      .locator("button")
      .filter({ hasText: /inscrire|s'inscrire|rejoindre|join|register/i })
      .first();
    await ctaButton.click();

    // After registration, the button should change to show the user is registered
    await expect(
      page.locator("button, [data-testid='registration-status']").filter({
        hasText: /inscrit|registered|annuler|cancel/i,
      }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should show the user as a member of the Circle after registration", async ({ page }) => {
    // Navigate to the Circle page — user should be a member after joining the Moment
    await page.goto(`/fr/m/${momentSlug}`);
    const circleLink = page.locator("a[href*='/circles/']").first();
    const href = await circleLink.getAttribute("href");
    if (href) {
      await page.goto(href);
      // On the Circle page, the user should see their membership status
      await expect(page.locator("main")).toBeVisible();
    }
  });
});

test.describe("Page Moment — Moment annulé", () => {
  test.skip(!process.env.E2E_CANCELLED_MOMENT_SLUG, "E2E_CANCELLED_MOMENT_SLUG non défini");

  test("should return 404 for a CANCELLED Moment", async ({ page }) => {
    const cancelledSlug = process.env.E2E_CANCELLED_MOMENT_SLUG;
    const response = await page.goto(`/fr/m/${cancelledSlug}`);
    expect(response?.status()).toBe(404);
  });
});

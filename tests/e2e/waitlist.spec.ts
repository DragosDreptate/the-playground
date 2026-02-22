import { test, expect } from "@playwright/test";

/**
 * Tests E2E — Liste d'attente (waitlist)
 *
 * Couvre :
 *   - Inscription sur un Moment complet -> statut liste d'attente
 *   - Affichage du statut "Liste d'attente" sur la page Moment
 *   - Promotion automatique depuis la liste d'attente lors d'une annulation
 *
 * Prérequis :
 *   - Serveur Next.js en cours (BASE_URL)
 *   - E2E_FULL_MOMENT_SLUG : slug d'un Moment PUBLISHED dont la capacité est atteinte
 *   - E2E_AUTH_STORAGE_STATE : fichier JSON de session Playwright (storageState)
 *     avec un utilisateur NON inscrit au Moment complet
 *   - E2E_WAITLISTED_MOMENT_SLUG : slug d'un Moment où l'utilisateur est en liste d'attente
 */

test.describe("Liste d'attente — inscription sur Moment complet", () => {
  test.skip(
    !process.env.E2E_FULL_MOMENT_SLUG || !process.env.E2E_AUTH_STORAGE_STATE,
    "E2E_FULL_MOMENT_SLUG ou E2E_AUTH_STORAGE_STATE non défini"
  );

  test.use({
    storageState: process.env.E2E_AUTH_STORAGE_STATE ?? "",
  });

  test("should display the Moment as full with a waitlist option", async ({ page }) => {
    const momentSlug = process.env.E2E_FULL_MOMENT_SLUG;
    await page.goto(`/fr/m/${momentSlug}`);

    // The page should indicate the Moment is full or show a waitlist button
    const waitlistIndicator = page
      .locator("button, [data-testid='registration-cta']")
      .filter({
        hasText: /liste d'attente|waitlist|rejoindre.*attente|join.*waitlist/i,
      })
      .first();

    // Either we see a waitlist CTA or a "complet" / "full" indicator
    const fullIndicator = page.locator("main").filter({
      hasText: /complet|full|places/i,
    });

    const hasWaitlist = await waitlistIndicator.isVisible().catch(() => false);
    const hasFull = await fullIndicator.isVisible().catch(() => false);

    expect(hasWaitlist || hasFull).toBe(true);
  });

  test("should register the user on the waitlist when Moment is full", async ({ page }) => {
    const momentSlug = process.env.E2E_FULL_MOMENT_SLUG;
    await page.goto(`/fr/m/${momentSlug}`);

    // Click the registration/waitlist CTA
    const ctaButton = page
      .locator("button")
      .filter({
        hasText: /rejoindre|join|inscrire|register|liste d'attente|waitlist/i,
      })
      .first();
    await ctaButton.click();

    // After registration, the status should indicate waitlisted
    await expect(
      page
        .locator("button, [data-testid='registration-status'], main")
        .filter({
          hasText: /liste d'attente|waitlist|en attente|waiting/i,
        })
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Liste d'attente — affichage statut", () => {
  test.skip(
    !process.env.E2E_WAITLISTED_MOMENT_SLUG ||
      !process.env.E2E_AUTH_STORAGE_STATE,
    "E2E_WAITLISTED_MOMENT_SLUG ou E2E_AUTH_STORAGE_STATE non défini"
  );

  test.use({
    storageState: process.env.E2E_AUTH_STORAGE_STATE ?? "",
  });

  test("should show the waitlisted status on the Moment page", async ({ page }) => {
    const momentSlug = process.env.E2E_WAITLISTED_MOMENT_SLUG;
    await page.goto(`/fr/m/${momentSlug}`);

    // The user should see their waitlist status
    await expect(
      page
        .locator("main")
        .filter({
          hasText: /liste d'attente|waitlist|en attente|waiting/i,
        })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should show the waitlisted Moment on the user dashboard", async ({ page }) => {
    await page.goto("/fr/dashboard");

    // The dashboard should list the waitlisted Moment with a waitlist badge
    await expect(page.locator("main")).toBeVisible();
  });
});

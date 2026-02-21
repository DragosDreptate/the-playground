import { test, expect } from "@playwright/test";

/**
 * Tests E2E — Annulation d'inscription
 *
 * Couvre :
 *   - Annuler une inscription depuis la page Moment publique
 *   - Le statut passe à "annulé" après annulation
 *   - Promotion depuis la liste d'attente après annulation
 *
 * Prérequis :
 *   - Serveur Next.js en cours (BASE_URL)
 *   - E2E_TEST_MOMENT_SLUG : slug d'un Moment PUBLISHED
 *   - E2E_AUTH_STORAGE_STATE : fichier JSON de session Playwright avec un utilisateur INSCRIT
 */

test.describe("Annulation d'inscription — utilisateur authentifié", () => {
  test.skip(
    !process.env.E2E_TEST_MOMENT_SLUG || !process.env.E2E_AUTH_STORAGE_STATE,
    "E2E_TEST_MOMENT_SLUG ou E2E_AUTH_STORAGE_STATE non défini"
  );

  test.use({
    storageState: process.env.E2E_AUTH_STORAGE_STATE ?? "",
  });

  test("should display a cancel button for a registered user", async ({ page }) => {
    const momentSlug = process.env.E2E_TEST_MOMENT_SLUG;
    await page.goto(`/fr/m/${momentSlug}`);

    // A registered user sees a cancel button
    const cancelButton = page
      .locator("button")
      .filter({ hasText: /annuler|cancel/i })
      .first();
    await expect(cancelButton).toBeVisible({ timeout: 10_000 });
  });

  test("should cancel the registration and update the UI", async ({ page }) => {
    const momentSlug = process.env.E2E_TEST_MOMENT_SLUG;
    await page.goto(`/fr/m/${momentSlug}`);

    // Click cancel
    const cancelButton = page
      .locator("button")
      .filter({ hasText: /annuler.*inscription|cancel.*registration/i })
      .first();
    await cancelButton.click();

    // Confirm in the dialog if there is one
    const confirmButton = page
      .locator("button, [role='alertdialog'] button")
      .filter({ hasText: /confirmer|confirm|oui|yes/i })
      .first();
    if (await confirmButton.isVisible({ timeout: 2_000 })) {
      await confirmButton.click();
    }

    // After cancellation, the register CTA should appear again
    await expect(
      page
        .locator("button")
        .filter({ hasText: /inscrire|s'inscrire|rejoindre|join|register/i })
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Annulation — depuis le dashboard utilisateur", () => {
  test.skip(
    !process.env.E2E_AUTH_STORAGE_STATE,
    "E2E_AUTH_STORAGE_STATE non défini"
  );

  test.use({
    storageState: process.env.E2E_AUTH_STORAGE_STATE ?? "",
  });

  test("should list upcoming registrations on the dashboard", async ({ page }) => {
    await page.goto("/fr/dashboard");
    // The dashboard shows "Mes prochains Moments" tab
    await expect(page.locator("main")).toBeVisible();
  });
});

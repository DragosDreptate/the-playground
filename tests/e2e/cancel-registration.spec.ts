import { test, expect } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Tests E2E — Annulation d'inscription
 *
 * Couvre :
 *   - Annuler une inscription depuis la page Moment publique
 *   - Le CTA S'inscrire réapparaît après annulation
 *   - Dashboard utilisateur : liste des inscriptions à venir
 */

test.describe("Annulation d'inscription — utilisateur authentifié", () => {
  test.describe.configure({ retries: 0 }); // mutation DB — pas de retry
  test.use({ storageState: AUTH.PLAYER });

  test("should display a cancel button for a registered user", async ({ page }) => {
    await page.goto(`/fr/m/${SLUGS.PUBLISHED_MOMENT}`);

    // Player1 est inscrit au Meetup IA — doit voir le bouton annuler
    const cancelButton = page
      .locator("button")
      .filter({ hasText: /annuler|cancel/i })
      .first();
    await expect(cancelButton).toBeVisible({ timeout: 10_000 });
  });

  test("should cancel the registration and show the register CTA again", async ({ page }) => {
    await page.goto(`/fr/m/${SLUGS.PUBLISHED_MOMENT}`);

    // Cliquer sur "Annuler mon inscription" pour ouvrir le dialog de confirmation
    const cancelButton = page
      .locator("button")
      .filter({ hasText: /annuler mon inscription|cancel.*registration/i })
      .first();
    await expect(cancelButton).toBeVisible({ timeout: 10_000 });
    await cancelButton.click();

    // Attendre le dialog et cliquer sur confirmer
    const confirmButton = page
      .locator("[role='alertdialog'] button")
      .filter({ hasText: /oui|yes|confirmer|confirm/i })
      .first();
    await expect(confirmButton).toBeVisible({ timeout: 5_000 });
    await confirmButton.click();

    // Après annulation, le CTA S'inscrire doit réapparaître
    await expect(
      page
        .locator("button")
        .filter({ hasText: /inscrire|s'inscrire|rejoindre|join|register/i })
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Annulation — depuis le dashboard utilisateur", () => {
  test.use({ storageState: AUTH.PLAYER });

  test("should list upcoming registrations on the dashboard", async ({ page }) => {
    await page.goto("/fr/dashboard");
    await expect(page).not.toHaveURL(/\/auth\/sign-in/);
    // Le dashboard affiche les inscriptions à venir
    await expect(page.locator("main")).toBeVisible();
  });
});

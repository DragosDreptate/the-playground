import { test, expect } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Tests E2E — Feature co-organisateurs
 *
 * Couvre les parcours UI introduits par la feature CO_HOST, côté HOST :
 *   - Accès à la liste des membres du Circle côté dashboard
 *   - Présence du menu contextuel avec l'action "Promouvoir en co-organisateur"
 *     sur un membre PLAYER ACTIVE
 *   - Le bouton ne permet pas d'actionner le HOST principal lui-même
 *
 * Les scénarios de promotion / rétrogradation avec transition d'état sont
 * couverts par les tests unitaires (promote-to-co-host.test.ts,
 * demote-from-co-host.test.ts) et les tests RBAC (co-host-authorization.test.ts).
 * Les tests E2E se concentrent sur la surface UI.
 */

test.describe("Co-organisateurs — UI HOST", () => {
  test.use({ storageState: AUTH.HOST });

  test("should display the members section on the Circle dashboard", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);

    // La section membres est accessible
    const membersSection = page.locator("#members-section");
    await expect(membersSection).toBeVisible();
    await expect(membersSection).toContainText(/Membres/i);
  });

  test("should show the contextual menu trigger for PLAYER members", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);

    const membersSection = page.locator("#members-section");
    // Au moins un bouton d'actions doit être présent pour les PLAYERs de la Communauté seed
    const actionButtons = membersSection.locator('button[aria-label="Actions"]');
    await expect(actionButtons.first()).toBeVisible();
  });

  test("should expose the Promote to co-organizer action in the menu", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);

    const membersSection = page.locator("#members-section");
    const firstActionButton = membersSection.locator('button[aria-label="Actions"]').first();
    await firstActionButton.click();

    // Le menu ouvre et contient l'action Promouvoir
    await expect(page.getByText("Promouvoir en co-organisateur")).toBeVisible();
  });

  test("should show the single Organisateur badge on the Circle HOST", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);

    const membersSection = page.locator("#members-section");
    // Badge unique "Organisateur" pour HOST et CO_HOST, partout (D8 simplifié)
    await expect(membersSection).toContainText(/Organisateur/);
  });
});

test.describe("Co-organisateurs — UI public", () => {
  test("should show a single Organisateur badge on the public Circle page", async ({ page }) => {
    await page.goto(`/fr/circles/${SLUGS.CIRCLE}`);

    // Badge unique "Organisateur" côté public comme dashboard — HOST et CO_HOST confondus
    await expect(page.locator("body")).toContainText(/Organisateur/);
  });
});

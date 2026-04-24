import { test, expect } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Tests E2E — Feature co-organisateurs
 *
 * Couvre les parcours UI introduits par la feature CO_HOST, côté HOST :
 *   - Accès à la liste des membres du Circle côté dashboard (via modale)
 *   - Présence du menu contextuel avec l'action "Promouvoir en co-organisateur"
 *     sur un membre PLAYER ACTIVE
 *   - Le bouton ne permet pas d'actionner le HOST principal lui-même
 *
 * Depuis la refonte Circle (commit 76e4510), la section membres inline
 * (#members-section) a été remplacée par une modale CircleMembersDialog
 * ouverte au clic sur le bloc stats "X Membres" ou le bloc avatars.
 *
 * Les scénarios de promotion / rétrogradation avec transition d'état sont
 * couverts par les tests unitaires (promote-to-co-host.test.ts,
 * demote-from-co-host.test.ts) et les tests RBAC (co-host-authorization.test.ts).
 * Les tests E2E se concentrent sur la surface UI.
 */

/** Ouvre la modale Membres via le bloc stats "X Membres" et retourne le dialog. */
async function openMembersDialog(page: Parameters<Parameters<typeof test>[2]>[0]["page"]) {
  const trigger = page.getByRole("button", { name: /\d+ membres?/i }).first();
  await expect(trigger).toBeVisible();
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("Co-organisateurs — UI HOST", () => {
  test.use({ storageState: AUTH.HOST });

  test("should display the members modal on the Circle dashboard", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);

    // La modale membres est accessible via le bloc stats
    const dialog = await openMembersDialog(page);
    await expect(dialog).toContainText(/Membres/i);
  });

  test("should show the contextual menu trigger for PLAYER members", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);

    const dialog = await openMembersDialog(page);
    // Au moins un bouton d'actions doit être présent pour les PLAYERs de la Communauté seed
    // On exclut les boutons disabled (HOST principal qui ne peut pas s'auto-promouvoir)
    const actionButtons = dialog.locator('button[aria-label="Actions"]:not([disabled])');
    await expect(actionButtons.first()).toBeVisible();
  });

  test("should expose the Promote to co-organizer action in the menu", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);

    const dialog = await openMembersDialog(page);
    // On exclut les boutons disabled (HOST principal)
    const firstActionButton = dialog
      .locator('button[aria-label="Actions"]:not([disabled])')
      .first();
    await firstActionButton.click();

    // Le menu ouvre et contient l'action Promouvoir
    await expect(page.getByText("Promouvoir en co-organisateur")).toBeVisible();
  });

  test("should show the single Organisateur badge on the Circle HOST", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);

    const dialog = await openMembersDialog(page);
    // Badge unique "Organisateur" pour HOST et CO_HOST, partout (D8 simplifié)
    await expect(dialog).toContainText(/Organisateur/);
  });
});

test.describe("Co-organisateurs — UI public", () => {
  test.use({ storageState: AUTH.PLAYER });

  test("should show a single Organisateur badge on the public Circle page", async ({ page }) => {
    await page.goto(`/fr/circles/${SLUGS.CIRCLE}`);

    // Badge unique "Organisateur" côté public comme dashboard — HOST et CO_HOST confondus.
    // Depuis la refonte, le badge est dans la modale Membres (la section inline a été retirée).
    const dialog = await openMembersDialog(page);
    await expect(dialog).toContainText(/Organisateur/);
  });
});

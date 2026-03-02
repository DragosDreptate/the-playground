import { test, expect } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Tests E2E — Broadcast (Inviter ma Communauté)
 *
 * Couvre :
 *   - Le bouton "Envoyer" est visible sur la page détail Moment (vue Host)
 *   - L'ouverture de la modale de confirmation
 *   - L'envoi d'une invitation avec message personnalisé
 *   - Le bouton passe en état "Envoyée" après envoi
 *   - Un non-Host ne voit pas la section broadcast
 */

// URL de la page détail Moment côté Host (dashboard)
const HOST_MOMENT_URL = `/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/${SLUGS.PUBLISHED_MOMENT}`;

test.describe("Broadcast — vue Host (page détail Moment)", () => {
  test.use({ storageState: AUTH.HOST });

  test("should display the broadcast trigger section on the Host Moment detail page", async ({
    page,
  }) => {
    await page.goto(HOST_MOMENT_URL);

    // La section "Inviter ma Communauté" est visible
    await expect(page.locator("main")).toContainText(
      /inviter ma communauté|envoyer un email d'invitation/i,
      { timeout: 10_000 }
    );
  });

  test("should show the broadcast send button in enabled state when not yet sent", async ({
    page,
  }) => {
    await page.goto(HOST_MOMENT_URL);

    // Le bouton d'envoi est visible et actif (broadcastSentAt === null au début du run)
    const broadcastButton = page
      .locator("button")
      .filter({ hasText: /envoyer|envoyée/i })
      .first();
    await expect(broadcastButton).toBeVisible({ timeout: 10_000 });
    await expect(broadcastButton).toBeEnabled();
  });

  test("should open the broadcast dialog when clicking the send button", async ({
    page,
  }) => {
    await page.goto(HOST_MOMENT_URL);

    const broadcastButton = page
      .locator("button")
      .filter({ hasText: /^envoyer$/i })
      .first();
    await expect(broadcastButton).toBeEnabled({ timeout: 10_000 });
    await broadcastButton.click();

    // La modale s'ouvre : titre + description visibles
    await expect(
      page.getByRole("dialog").filter({ hasText: /inviter ma communauté/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test("should display the custom message textarea in the dialog", async ({
    page,
  }) => {
    await page.goto(HOST_MOMENT_URL);

    const broadcastButton = page
      .locator("button")
      .filter({ hasText: /^envoyer$/i })
      .first();
    await expect(broadcastButton).toBeEnabled({ timeout: 10_000 });
    await broadcastButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // La textarea pour le message personnalisé est présente
    const textarea = dialog.locator("textarea");
    await expect(textarea).toBeVisible();
  });

  test("should close the dialog when clicking Cancel", async ({ page }) => {
    await page.goto(HOST_MOMENT_URL);

    const broadcastButton = page
      .locator("button")
      .filter({ hasText: /^envoyer$/i })
      .first();
    await expect(broadcastButton).toBeEnabled({ timeout: 10_000 });
    await broadcastButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Clic sur "Annuler" ferme la modale
    await dialog
      .locator("button")
      .filter({ hasText: /annuler/i })
      .click();

    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });

  test("should send the broadcast with a custom message and mark the button as sent", async ({
    page,
  }) => {
    await page.goto(HOST_MOMENT_URL);

    const broadcastButton = page
      .locator("button")
      .filter({ hasText: /^envoyer$/i })
      .first();
    await expect(broadcastButton).toBeEnabled({ timeout: 10_000 });
    await broadcastButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Saisir un message personnalisé
    const textarea = dialog.locator("textarea");
    await textarea.fill("Message de test E2E — ne pas tenir compte.");

    // Clic sur "Envoyer" dans la modale
    await dialog
      .locator("button")
      .filter({ hasText: /^envoyer$/i })
      .click();

    // La modale se ferme quand result.success === true (broadcastSentAt est en DB)
    await expect(dialog).not.toBeVisible({ timeout: 15_000 });

    // Recharger pour obtenir l'état frais du serveur
    await page.goto(HOST_MOMENT_URL);
    const sentButton = page
      .locator("button")
      .filter({ hasText: /envoyée/i })
      .first();
    await expect(sentButton).toBeVisible({ timeout: 10_000 });
    await expect(sentButton).toBeDisabled();
  });
});

test.describe("Broadcast — bouton désactivé sur un Moment PAST (vue Host)", () => {
  test.use({ storageState: AUTH.HOST });

  test("should NOT show the broadcast button on a PAST Moment", async ({
    page,
  }) => {
    await page.goto(
      `/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/${SLUGS.PAST_MOMENT}`
    );

    // Sur un Moment passé, la section broadcast est masquée
    await expect(page.locator("main")).not.toContainText(/inviter ma communauté/i, {
      timeout: 10_000,
    });
  });
});

test.describe("Broadcast — section non visible pour les non-Hosts", () => {
  test.use({ storageState: AUTH.PLAYER });

  test("should NOT show the broadcast section for a Player (public Moment page)", async ({
    page,
  }) => {
    // Un Player voit la page publique /m/[slug], pas le dashboard Host
    await page.goto(`/fr/m/${SLUGS.PUBLISHED_MOMENT}`);

    // La section "Inviter ma Communauté" ne doit pas être visible pour un non-Host
    await expect(page.locator("main").first()).not.toContainText(
      /inviter ma communauté/i,
      { timeout: 10_000 }
    );
  });

  test("should NOT show the broadcast section when a Player visits the dashboard Moment page", async ({
    page,
  }) => {
    // Un Player membre du Circle voit la vue publique — pas la section broadcast Host
    await page.goto(HOST_MOMENT_URL);

    // La section "Inviter ma Communauté" est réservée aux Hosts
    await expect(page.locator("main").first()).not.toContainText(
      /inviter ma communauté/i,
      { timeout: 10_000 }
    );
  });
});

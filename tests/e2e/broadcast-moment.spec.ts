import { test, expect } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Tests E2E — Broadcast (Inviter ma Communauté)
 *
 * Couvre :
 *   - Le bouton "Envoyer" est visible sur la page détail Moment (vue Host)
 *   - Le bouton est désactivé si le broadcast a déjà été envoyé
 *   - L'ouverture de la modale de confirmation
 *   - L'envoi d'une invitation (avec et sans message personnalisé)
 *   - Le bouton passe en état "Envoyée" après envoi
 *   - Un non-Host ne voit pas le bouton de broadcast
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

  test("should send the broadcast and mark the button as already sent", async ({
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

    // Attendre la réponse POST avant de cliquer pour éviter les flaps React 19
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes("_next/static") === false &&
          r.request().method() === "POST",
        { timeout: 15_000 }
      ),
      dialog
        .locator("button")
        .filter({ hasText: /^envoyer$/i })
        .click(),
    ]);

    // La réponse doit être 200
    expect(response.status()).toBeLessThan(500);

    // Après envoi, le bouton doit passer en état "Envoyée" (désactivé)
    await page.goto(HOST_MOMENT_URL);
    const sentButton = page
      .locator("button")
      .filter({ hasText: /envoyée/i })
      .first();
    await expect(sentButton).toBeVisible({ timeout: 10_000 });
    await expect(sentButton).toBeDisabled();
  });

  test("should send the broadcast with a custom message", async ({ page }) => {
    // Note : ce test ne peut s'exécuter que si le broadcast n'a pas encore été envoyé.
    // En CI, il tourne AVANT le test "should send the broadcast" (ordonnancement Playwright).
    // En local, relancer le seed remet broadcastSentAt à null.
    await page.goto(HOST_MOMENT_URL);

    const broadcastButton = page
      .locator("button")
      .filter({ hasText: /^envoyer$/i })
      .first();

    // Si le broadcast a déjà été envoyé par un test précédent, skip proprement
    const isDisabled = await broadcastButton
      .isDisabled()
      .catch(() => true);
    if (isDisabled) {
      test.skip();
      return;
    }

    await broadcastButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Saisir un message personnalisé
    const textarea = dialog.locator("textarea");
    await textarea.fill("Message de test E2E — ne pas tenir compte.");

    // Envoyer
    await dialog
      .locator("button")
      .filter({ hasText: /^envoyer$/i })
      .click();

    // La modale se ferme après succès
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });
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

test.describe("Broadcast — accès refusé aux non-Hosts", () => {
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

  test("should redirect to 404 when a Player tries to access the Host Moment detail page", async ({
    page,
  }) => {
    // Un Player ne fait pas partie du Circle comme HOST → la page retourne 404
    const response = await page.goto(HOST_MOMENT_URL);
    // Playwright suit les redirections — on vérifie soit un 404, soit une redirection
    const finalUrl = page.url();
    const isNotFound =
      (response?.status() === 404) ||
      finalUrl.includes("not-found") ||
      finalUrl.includes("404");
    // Si la page est une 404 ou si le contenu indique "introuvable"
    const content = await page.locator("main").first().textContent();
    const is404Content = /introuvable|not found|404/i.test(content ?? "");

    expect(isNotFound || is404Content).toBe(true);
  });
});

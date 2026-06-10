import { test, expect } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Tests E2E — Message aux participants (issue #515)
 *
 * ⚠️ Ce parcours déclenche des envois d'emails : lire spec/email-testing.md
 * avant tout lancement. Les destinataires @test.playground sont filtrés par
 * safe-resend, aucun email réel ne part en local/CI.
 *
 * Couvre :
 *   - La rangée « Message aux participants » est visible sur la page détail (vue Host)
 *   - Elle est visible aussi sur un événement PAST (suivi post-événement)
 *   - L'ouverture du dialog, la composition (objet + rich text) et l'envoi
 *   - Le bouton Envoyer est désactivé tant que le formulaire est incomplet
 *   - Un non-Host ne voit pas la rangée
 */

const HOST_MOMENT_URL = `/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/${SLUGS.PUBLISHED_MOMENT}`;

test.describe("Message aux participants — vue Host", () => {
  test.use({ storageState: AUTH.HOST });

  test("should display the host message row on the Host Moment detail page", async ({
    page,
  }) => {
    await page.goto(HOST_MOMENT_URL);

    await expect(page.locator("main")).toContainText(/message aux participants/i, {
      timeout: 10_000,
    });
  });

  test("should display the host message row on a PAST Moment (post-event follow-up)", async ({
    page,
  }) => {
    await page.goto(
      `/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/${SLUGS.PAST_MOMENT}`
    );

    await expect(page.locator("main")).toContainText(/message aux participants/i, {
      timeout: 10_000,
    });
  });

  test("should open the dialog with subject field and rich text editor", async ({
    page,
  }) => {
    await page.goto(HOST_MOMENT_URL);

    await page
      .getByRole("button", { name: /écrire/i })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog).toContainText(/message aux participants/i);
    await expect(dialog.locator("#host-message-subject")).toBeVisible();
    // L'éditeur rich text (Tiptap) expose un contenteditable + sa toolbar
    await expect(dialog.locator('[contenteditable="true"]')).toBeVisible();
    await expect(dialog.getByRole("button", { name: /gras/i })).toBeVisible();
  });

  test("should keep the send button disabled until subject and body are filled", async ({
    page,
  }) => {
    await page.goto(HOST_MOMENT_URL);

    await page
      .getByRole("button", { name: /écrire/i })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const sendButton = dialog.getByRole("button", { name: /^envoyer$/i });
    await expect(sendButton).toBeDisabled();

    await dialog.locator("#host-message-subject").fill("Objet de test E2E");
    await expect(sendButton).toBeDisabled();

    await dialog.locator('[contenteditable="true"]').fill("Corps de test E2E.");
    await expect(sendButton).toBeEnabled();
  });

  test("should close the dialog when clicking Cancel", async ({ page }) => {
    await page.goto(HOST_MOMENT_URL);

    await page
      .getByRole("button", { name: /écrire/i })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await dialog.getByRole("button", { name: /annuler/i }).click();

    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });

  test("should send a message to the registered participants and show the success toast", async ({
    page,
  }) => {
    await page.goto(HOST_MOMENT_URL);

    await page
      .getByRole("button", { name: /écrire/i })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await dialog.locator("#host-message-subject").fill("Message de test E2E");
    await dialog
      .locator('[contenteditable="true"]')
      .fill("Message de test E2E, ne pas tenir compte.");

    await dialog.getByRole("button", { name: /^envoyer$/i }).click();

    await expect(dialog).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/message envoyé à \d+ participant/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("Message aux participants — non visible pour les non-Hosts", () => {
  test.use({ storageState: AUTH.PLAYER });

  test("should NOT show the host message row on the public Moment page", async ({
    page,
  }) => {
    await page.goto(`/fr/m/${SLUGS.PUBLISHED_MOMENT}`);

    await expect(page.locator("main").first()).not.toContainText(
      /message aux participants/i,
      { timeout: 10_000 }
    );
  });

  test("should NOT show the host message row when a Player visits the dashboard Moment page", async ({
    page,
  }) => {
    await page.goto(HOST_MOMENT_URL);

    await expect(page.locator("main").first()).not.toContainText(
      /message aux participants/i,
      { timeout: 10_000 }
    );
  });
});

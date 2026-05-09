import { test, expect } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Tests E2E — Contacter l'organisateur (issue #425)
 *
 * Couvre :
 *   - Visibilité du lien "Contacter l'organisateur" sur les pages publiques
 *   - Ouverture de la modale + envoi d'un message
 *   - Lien caché pour l'Organisateur lui-même (pas de self-contact)
 *
 * L'envoi réel d'email est neutralisé en local par `safe-resend.ts` (guard
 * `VERCEL_ENV !== "production"`) et par le filtre `@test.playground` dans
 * `ResendEmailService`. Les tests vérifient le flow UI et le toast de succès.
 */

test.describe("Contacter l'organisateur — visibilité du lien", () => {
  test.use({ storageState: AUTH.PLAYER });

  test("should show the trigger on the public Community page", async ({ page }) => {
    await page.goto(`/fr/circles/${SLUGS.PUBLIC_CIRCLE}`);
    await expect(
      page.getByRole("button", { name: /contacter l'organisateur/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should show the trigger on the public event page", async ({ page }) => {
    await page.goto(`/fr/m/${SLUGS.PUBLISHED_MOMENT}`);
    await expect(
      page.getByRole("button", { name: /contacter l'organisateur/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Contacter l'organisateur — Organisateur ne peut pas se contacter lui-même", () => {
  test.use({ storageState: AUTH.HOST });

  test("should hide the trigger for the host on the public Community page", async ({ page }) => {
    await page.goto(`/fr/circles/${SLUGS.CIRCLE}`);
    await expect(
      page.getByRole("button", { name: /contacter l'organisateur/i })
    ).toHaveCount(0);
  });
});

test.describe("Contacter l'organisateur — envoi d'un message", () => {
  test.use({ storageState: AUTH.PLAYER });

  test("should send a message from the public Community page and show a success toast", async ({
    page,
  }) => {
    await page.goto(`/fr/circles/${SLUGS.PUBLIC_CIRCLE}`);

    await page
      .getByRole("button", { name: /contacter l'organisateur/i })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const textarea = dialog.locator("textarea");
    await textarea.fill(
      `E2E contact-organizer ${Date.now()} — message de test suffisamment long`
    );

    await dialog
      .getByRole("button", { name: /envoyer le message/i })
      .click();

    await expect(page.getByText(/message envoyé/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});

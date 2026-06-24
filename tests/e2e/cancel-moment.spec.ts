import { test, expect } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Test E2E — Annulation d'un événement par l'organisateur.
 *
 * Parcours : créer + publier un Moment DÉDIÉ (aucun inscrit hormis le host),
 * l'annuler via le bouton contextuel, puis vérifier l'état annulé côté host
 * (bandeau + badge cover, « Annuler » remplacé par « Supprimer ») et côté
 * public anonyme (« Événement annulé », plus de bouton d'inscription).
 *
 * ⚠️ L'annulation déclenche `sendMomentCancelledEmails`. On utilise un Moment
 * dédié sans inscrits pour ne pas polluer les autres specs ni envoyer en masse ;
 * les destinataires éventuels sont en `@test.playground` (auto-whitelist
 * `safe-resend`), comme pour les tests de publication existants. Voir
 * spec/email-testing.md. Ne jamais lancer en `--repeat-each` sans vérifier
 * `AUTH_RESEND_KEY`.
 */
test.describe("Flux Host — annulation d'un Moment", () => {
  test.use({ storageState: AUTH.HOST });

  test("should cancel a published event and surface the cancelled state", async ({
    page,
    browser,
  }) => {
    // 1. Créer + publier un Moment dédié
    const title = `E2E Cancel ${Date.now()}`;
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/new`);
    await page.locator("input[name='title']").first().fill(title);

    const dateInput = page
      .locator("input[name='startsAt'], input[type='datetime-local']")
      .first();
    if (await dateInput.isVisible()) {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await dateInput.fill(futureDate.toISOString().slice(0, 16));
    }
    const description = page.locator("textarea[name='description']");
    if (await description.isVisible()) {
      await description.fill("Description E2E annulation");
    }

    await page.locator("button[name='intent'][value='publish']").click();
    await page.waitForURL(
      (url) => {
        const path = new URL(url).pathname;
        return (
          /\/dashboard\/circles\/[^/]+\/moments\/[^/]+$/.test(path) &&
          !path.endsWith("/moments/new")
        );
      },
      { timeout: 15_000 }
    );
    const momentSlug = new URL(page.url()).pathname.split("/").pop()!;

    // 2. Annuler via le bouton contextuel + confirmation
    const cancelButton = page.getByRole("button", {
      name: /annuler l'événement/i,
    });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("button", { name: /oui, annuler/i }).click();

    // 3. État annulé côté host : bandeau visible, plus de bouton « Annuler »,
    //    « Supprimer » disponible à la place.
    await expect(
      page.getByText(/cet événement a été annulé/i).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /annuler l'événement/i })
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /supprimer/i }).first()
    ).toBeVisible();

    // 4. Côté public anonyme : « Événement annulé » visible, pas d'inscription.
    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();
    await anonPage.goto(`/fr/m/${momentSlug}`);
    await expect(
      anonPage.getByText(/événement annulé/i).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      anonPage.getByRole("button", { name: /s'inscrire/i })
    ).toHaveCount(0);
    await anonContext.close();
  });
});

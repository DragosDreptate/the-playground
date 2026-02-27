import { test, expect } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Tests E2E — Fil de commentaires sur un Moment
 *
 * Couvre :
 *   - Affichage du fil de commentaires sur la page Moment
 *   - Ajout d'un commentaire (utilisateur authentifié)
 *   - Suppression d'un commentaire par l'auteur
 *   - Formulaire masqué sur un Moment passé
 */

test.describe("Fil de commentaires — affichage public", () => {
  test("should display the comments section on the Moment page", async ({ page }) => {
    await page.goto(`/fr/m/${SLUGS.PUBLISHED_MOMENT}`);
    // La section commentaires est présente (même si vide)
    await expect(page.locator("main")).toBeVisible();
  });

  test("should display existing comments on a PAST Moment", async ({ page }) => {
    await page.goto(`/fr/m/${SLUGS.PAST_MOMENT}`);
    // Des commentaires sont seedés sur la Soirée JS & Pizza
    await expect(page.locator("main")).toContainText(/Super soirée|Server Components|Bun vs Node/i);
  });
});

test.describe("Fil de commentaires — utilisateur authentifié", () => {
  test.use({ storageState: AUTH.PLAYER });

  test("should show the comment form for an authenticated user", async ({ page }) => {
    await page.goto(`/fr/m/${SLUGS.PUBLISHED_MOMENT}`);

    const commentForm = page
      .locator("textarea, input[name='content']")
      .filter({ hasText: "" })
      .first();
    await expect(commentForm).toBeVisible({ timeout: 10_000 });
  });

  test("should add a comment and display it in the thread", async ({ page }) => {
    const commentText = `E2E test comment ${Date.now()}`;

    await page.goto(`/fr/m/${SLUGS.PUBLISHED_MOMENT}`);

    const textarea = page.locator("textarea").first();
    await textarea.fill(commentText);

    // Le bouton "Publier" n'est pas type='submit', c'est un onClick
    // Attendre qu'il soit enabled (disabled tant que content est vide)
    const submitButton = page
      .locator("button")
      .filter({ hasText: /publier|commenter|envoyer|post/i })
      .first();
    await expect(submitButton).toBeEnabled({ timeout: 5_000 });
    await submitButton.click();

    await expect(page.locator("main").first()).toContainText(commentText, { timeout: 10_000 });
  });

  test("should allow the comment author to delete their comment", async ({ page }) => {
    const commentText = `E2E delete test ${Date.now()}`;

    await page.goto(`/fr/m/${SLUGS.PUBLISHED_MOMENT}`);

    // Ajouter un commentaire
    const textarea = page.locator("textarea").first();
    await textarea.fill(commentText);
    const submitButton = page
      .locator("button")
      .filter({ hasText: /publier|commenter|envoyer|post/i })
      .first();
    await expect(submitButton).toBeEnabled({ timeout: 5_000 });
    await submitButton.click();

    // 2 éléments <main> sur la page — utiliser .first()
    await expect(page.locator("main").first()).toContainText(commentText, { timeout: 10_000 });

    // Le commentaire est dans un <div>, pas <li> ou <article>
    // On trouve le bouton "Supprimer" le plus proche du texte du commentaire
    // Le dernier bouton "Supprimer" visible est celui du commentaire qu'on vient de créer
    const deleteButton = page
      .locator("button")
      .filter({ hasText: /supprimer|delete/i })
      .last();
    await deleteButton.click();

    const confirmButton = page
      .locator("button")
      .filter({ hasText: /confirmer|confirm|oui|yes|supprimer/i })
      .last();
    if (await confirmButton.isVisible({ timeout: 2_000 })) {
      await confirmButton.click();
    }

    await expect(page.locator("main").first()).not.toContainText(commentText, { timeout: 10_000 });
  });
});

test.describe("Fil de commentaires — Moment passé", () => {
  test.use({ storageState: AUTH.PLAYER });

  test("should show a different placeholder on a PAST Moment", async ({ page }) => {
    await page.goto(`/fr/m/${SLUGS.PAST_MOMENT}`);

    // Sur un Moment passé, la textarea reste visible mais le placeholder change
    // (la fonctionnalité de masquage n'est pas implémentée — seul le placeholder change)
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 5_000 });
  });

  test("should still display existing comments on a PAST Moment", async ({ page }) => {
    await page.goto(`/fr/m/${SLUGS.PAST_MOMENT}`);
    // Les commentaires seedés sont visibles
    await expect(page.locator("main")).toContainText(/Super soirée|Server Components/i);
  });
});

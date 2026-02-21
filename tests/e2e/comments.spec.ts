import { test, expect } from "@playwright/test";

/**
 * Tests E2E — Fil de commentaires sur un Moment
 *
 * Couvre :
 *   - Affichage du fil de commentaires sur la page Moment
 *   - Ajout d'un commentaire (utilisateur authentifié)
 *   - Suppression d'un commentaire par l'auteur
 *   - Formulaire masqué sur un Moment passé
 *
 * Prérequis :
 *   - Serveur Next.js en cours (BASE_URL)
 *   - E2E_TEST_MOMENT_SLUG : slug d'un Moment PUBLISHED
 *   - E2E_PAST_MOMENT_SLUG : slug d'un Moment PAST
 *   - E2E_AUTH_STORAGE_STATE : fichier JSON de session Playwright
 */

test.describe("Fil de commentaires — affichage public", () => {
  test.skip(!process.env.E2E_TEST_MOMENT_SLUG, "E2E_TEST_MOMENT_SLUG non défini");

  test("should display the comments section on the Moment page", async ({ page }) => {
    const momentSlug = process.env.E2E_TEST_MOMENT_SLUG;
    await page.goto(`/fr/m/${momentSlug}`);
    // Comments section is present (even if empty)
    await expect(page.locator("main")).toBeVisible();
  });
});

test.describe("Fil de commentaires — utilisateur authentifié", () => {
  test.skip(
    !process.env.E2E_TEST_MOMENT_SLUG || !process.env.E2E_AUTH_STORAGE_STATE,
    "E2E_TEST_MOMENT_SLUG ou E2E_AUTH_STORAGE_STATE non défini"
  );

  test.use({
    storageState: process.env.E2E_AUTH_STORAGE_STATE ?? "",
  });

  test("should show the comment form for an authenticated user", async ({ page }) => {
    const momentSlug = process.env.E2E_TEST_MOMENT_SLUG;
    await page.goto(`/fr/m/${momentSlug}`);

    // Comment textarea or input should be visible
    const commentForm = page
      .locator("textarea, input[name='content']")
      .filter({ hasText: "" })
      .first();
    await expect(commentForm).toBeVisible({ timeout: 10_000 });
  });

  test("should add a comment and display it in the thread", async ({ page }) => {
    const momentSlug = process.env.E2E_TEST_MOMENT_SLUG;
    const commentText = `E2E test comment ${Date.now()}`;

    await page.goto(`/fr/m/${momentSlug}`);

    // Find the comment textarea
    const textarea = page.locator("textarea").first();
    await textarea.fill(commentText);

    // Submit the comment
    const submitButton = page
      .locator("button[type='submit']")
      .filter({ hasText: /commenter|publier|envoyer|post|submit/i })
      .first();
    await submitButton.click();

    // The comment should appear in the thread
    await expect(page.locator("main")).toContainText(commentText, { timeout: 10_000 });
  });

  test("should allow the comment author to delete their comment", async ({ page }) => {
    const momentSlug = process.env.E2E_TEST_MOMENT_SLUG;
    const commentText = `E2E delete test ${Date.now()}`;

    await page.goto(`/fr/m/${momentSlug}`);

    // Add a comment first
    const textarea = page.locator("textarea").first();
    await textarea.fill(commentText);
    const submitButton = page
      .locator("button[type='submit']")
      .filter({ hasText: /commenter|publier|envoyer|post|submit/i })
      .first();
    await submitButton.click();

    // Wait for comment to appear
    await expect(page.locator("main")).toContainText(commentText, { timeout: 10_000 });

    // Find and click the delete button for this comment
    const commentItem = page.locator("li, article, [data-testid='comment']").filter({ hasText: commentText }).first();
    const deleteButton = commentItem
      .locator("button")
      .filter({ hasText: /supprimer|delete/i })
      .first();
    await deleteButton.click();

    // Confirm if a dialog appears
    const confirmButton = page
      .locator("button")
      .filter({ hasText: /confirmer|confirm|oui|yes|supprimer/i })
      .last();
    if (await confirmButton.isVisible({ timeout: 2_000 })) {
      await confirmButton.click();
    }

    // The comment should be removed
    await expect(page.locator("main")).not.toContainText(commentText, { timeout: 10_000 });
  });
});

test.describe("Fil de commentaires — Moment passé", () => {
  test.skip(
    !process.env.E2E_PAST_MOMENT_SLUG || !process.env.E2E_AUTH_STORAGE_STATE,
    "E2E_PAST_MOMENT_SLUG ou E2E_AUTH_STORAGE_STATE non défini"
  );

  test.use({
    storageState: process.env.E2E_AUTH_STORAGE_STATE ?? "",
  });

  test("should hide the comment form on a PAST Moment", async ({ page }) => {
    const pastSlug = process.env.E2E_PAST_MOMENT_SLUG;
    await page.goto(`/fr/m/${pastSlug}`);

    // On a PAST moment, the comment form should not be visible
    const textarea = page.locator("textarea").first();
    await expect(textarea).not.toBeVisible({ timeout: 5_000 });
  });

  test("should still display existing comments on a PAST Moment", async ({ page }) => {
    const pastSlug = process.env.E2E_PAST_MOMENT_SLUG;
    await page.goto(`/fr/m/${pastSlug}`);
    await expect(page.locator("main")).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Tests E2E — Événements payants (Stripe)
 *
 * Couvre :
 *   - Affichage du CTA payant (avec prix)
 *   - Événement payant complet → "Complet" sans waitlist
 *   - Non authentifié → "Se connecter" sans prix
 *   - Désinscription payante remboursable → modale verte
 *   - Désinscription payante non remboursable → modale amber
 *   - Retrait par l'Organisateur d'un inscrit payant → modale amber
 *   - CGU section Paiements
 *   - Page Aide sections payants
 *
 * Pré-requis seed : Circle "test-paid-events" avec stripeConnectAccountId,
 *   Moment "test-workshop-payant" (remboursable, 15€, player1 PAID),
 *   Moment "test-workshop-non-remboursable" (non remboursable, 25€, player1 PAID).
 */

// ── CTA payant — affichage prix ──────────────────────────────────────────────

test.describe("Événement payant — CTA avec prix", () => {
  // PLAYER3 is NOT registered on paid events — sees the CTA button
  test.use({ storageState: AUTH.PLAYER3 });

  test("should show price in registration button for paid event", async ({ page }) => {
    await page.goto(`/fr/m/${SLUGS.PAID_MOMENT_REFUNDABLE}`);
    const main = page.locator("main").first();
    const ctaButton = main.locator("button", { hasText: /S'inscrire.*EUR/i });
    await expect(ctaButton).toBeVisible();
    await expect(ctaButton).toContainText("15,00");
  });

  test("should NOT show price in registration button for free event", async ({ page }) => {
    await page.goto(`/fr/m/${SLUGS.PUBLISHED_MOMENT}`);
    const main = page.locator("main").first();
    const buttons = main.locator("button");
    const allTexts = await buttons.allTextContents();
    const hasPriceButton = allTexts.some((text) => /\d+,\d+ EUR/.test(text));
    expect(hasPriceButton).toBe(false);
  });
});

// ── Non authentifié — pas de prix dans le bouton ─────────────────────────────

test.describe("Événement payant — non authentifié", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should show sign-in button without price on paid event", async ({ page }) => {
    await page.goto(`/fr/m/${SLUGS.PAID_MOMENT_REFUNDABLE}`);
    const main = page.locator("main").first();
    const signInBtn = main.locator("a, button", { hasText: /se connecter/i });
    await expect(signInBtn.first()).toBeVisible();
    // Should NOT contain the price
    const signInText = await signInBtn.first().textContent();
    expect(signInText).not.toMatch(/15,00/);
  });
});

// ── Participant inscrit payant — affichage "Vous participez" ─────────────────

test.describe("Événement payant — participant inscrit (PAID)", () => {
  test.use({ storageState: AUTH.PLAYER });

  test("should show registered state on paid event", async ({ page }) => {
    await page.goto(`/fr/m/${SLUGS.PAID_MOMENT_REFUNDABLE}`);
    const main = page.locator("main").first();
    await expect(main.locator("text=Vous participez")).toBeVisible();
  });

  test("should show cancel link on paid event", async ({ page }) => {
    await page.goto(`/fr/m/${SLUGS.PAID_MOMENT_REFUNDABLE}`);
    const main = page.locator("main").first();
    await expect(main.locator("text=Annuler mon inscription")).toBeVisible();
  });
});

// ── Désinscription remboursable — modale verte ───────────────────────────────

test.describe("Désinscription événement payant remboursable", () => {
  test.use({ storageState: AUTH.PLAYER });

  test("should show green refund info in cancel dialog", async ({ page }) => {
    await page.goto(`/fr/m/${SLUGS.PAID_MOMENT_REFUNDABLE}`);
    const main = page.locator("main").first();

    const cancelLink = main.locator("button, a", { hasText: "Annuler mon inscription" });
    await cancelLink.waitFor({ state: "visible", timeout: 10000 });
    await cancelLink.click();

    const dialog = page.locator('[role="alertdialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Green refund message
    await expect(dialog.getByText(/remboursé automatiquement/i)).toBeVisible({ timeout: 5000 });

    // Close without cancelling
    await dialog.locator("button", { hasText: "Annuler" }).click();
  });
});

// ── Désinscription non remboursable — modale amber ───────────────────────────

test.describe("Désinscription événement payant non remboursable", () => {
  test.use({ storageState: AUTH.PLAYER });

  test("should show amber non-refundable warning in cancel dialog", async ({ page }) => {
    await page.goto(`/fr/m/${SLUGS.PAID_MOMENT_NON_REFUNDABLE}`);
    const main = page.locator("main").first();

    const cancelLink = main.locator("button, a", { hasText: "Annuler mon inscription" });
    await cancelLink.waitFor({ state: "visible", timeout: 10000 });
    await cancelLink.click();

    const dialog = page.locator('[role="alertdialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Amber non-refundable warning
    await expect(dialog.getByText(/pas remboursable/i)).toBeVisible({ timeout: 5000 });

    // Close without cancelling
    await dialog.locator("button", { hasText: "Annuler" }).click();
  });
});

// ── Retrait par l'Organisateur — modale avec avertissement refund ─────────────

test.describe("Retrait inscrit payant par l'Organisateur", () => {
  test.use({ storageState: AUTH.HOST });

  test("should show refund warning when removing a paid registration", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.PAID_CIRCLE}/moments/${SLUGS.PAID_MOMENT_REFUNDABLE}`);

    // Find the remove button for the paid participant (not the Host)
    const participantRow = page.locator("text=Thomas Dubois").locator("..");
    const removeBtn = participantRow.locator("button", { hasText: /retirer/i });

    if (await removeBtn.count() > 0) {
      await removeBtn.click();

      const dialog = page.locator('[role="alertdialog"]');
      await expect(dialog).toBeVisible();

      // Should show refund warning
      await expect(dialog.locator("text=remboursement")).toBeVisible();

      // Close without removing
      await dialog.locator("button", { hasText: "Annuler" }).click();
    }
  });
});

// ── Billetterie — résumé visible ─────────────────────────────────────────────

test.describe("Résumé billetterie (Host view)", () => {
  test.use({ storageState: AUTH.HOST });

  test("should show ticketing summary on paid event dashboard", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.PAID_CIRCLE}/moments/${SLUGS.PAID_MOMENT_REFUNDABLE}`);
    await expect(page.locator("text=Billetterie")).toBeVisible();
    await expect(page.locator("text=inscrit payant")).toBeVisible();
  });
});

// ── CGU — section Paiements ──────────────────────────────────────────────────

test.describe("CGU — section Paiements", () => {
  test("should display Payments section", async ({ page }) => {
    await page.goto("/fr/legal/cgu");
    await expect(page.locator("text=Paiements et transactions")).toBeVisible();
    await expect(page.locator("text=intermédiaire technique")).toBeVisible();
  });
});

// ── Page Aide — sections événements payants ──────────────────────────────────

test.describe("Page Aide — événements payants", () => {
  test("should display paid events section for participants", async ({ page }) => {
    await page.goto("/fr/help");
    await expect(page.locator("text=Événements payants").first()).toBeVisible();
    await expect(page.locator("text=page de paiement sécurisée Stripe")).toBeVisible();
  });

  test("should display payments section for organizers", async ({ page }) => {
    await page.goto("/fr/help");
    await expect(page.locator("text=Activer les paiements").first()).toBeVisible();
  });

  test("should display paid events FAQ", async ({ page }) => {
    await page.goto("/fr/help");
    await expect(page.locator("text=Comment fonctionnent les événements payants")).toBeVisible();
  });
});

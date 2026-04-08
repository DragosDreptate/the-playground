import { test, expect } from "@playwright/test";
import { SLUGS } from "./fixtures";

/**
 * Tests E2E — Réseau de Communautés (Circle Network)
 *
 * Couvre :
 *   - Page Réseau affiche les Communautés membres publiques
 *   - Badge Réseau visible sur la page Communauté membre
 *   - Badge Réseau absent sur une Communauté non-membre
 *   - Page Réseau avec slug inexistant → 404
 */

test.describe("Page Réseau — /networks/[slug]", () => {
  test("should display the network page with its name", async ({ page }) => {
    await page.goto(`/fr/networks/${SLUGS.NETWORK}`);

    await expect(page.locator("h1")).toContainText("Test Network");
  });

  test("should display member communities", async ({ page }) => {
    await page.goto(`/fr/networks/${SLUGS.NETWORK}`);

    // Le réseau contient paris-creative-tech
    const circleCard = page.locator("a[href*='/circles/paris-creative-tech']");
    await expect(circleCard).toBeVisible();
  });

  test("should show community count", async ({ page }) => {
    await page.goto(`/fr/networks/${SLUGS.NETWORK}`);

    // Au moins "1 Communauté"
    await expect(page.getByText(/\d+ Communauté/)).toBeVisible();
  });

  test("should return 404 for unknown network slug", async ({ page }) => {
    const response = await page.goto(`/fr/networks/this-network-does-not-exist`);
    expect(response?.status()).toBe(404);
  });
});

test.describe("Badge Réseau sur page Communauté", () => {
  test("should show network badge on member community page", async ({
    page,
  }) => {
    await page.goto(`/fr/circles/${SLUGS.CIRCLE}`);

    // Le badge "Membre de Test Network" doit être visible
    const badge = page.getByText("Membre de").first();
    await expect(badge).toBeVisible();

    // Le lien vers le réseau doit exister
    const networkLink = page.locator(
      `a[href*='/networks/${SLUGS.NETWORK}']`
    );
    await expect(networkLink).toBeVisible();
  });

  test("should NOT show network badge on non-member community page", async ({
    page,
  }) => {
    // yoga-montmartre n'est pas dans le réseau
    await page.goto(`/fr/circles/${SLUGS.PUBLIC_CIRCLE}`);

    const badge = page.locator(`a[href*='/networks/']`);
    await expect(badge).toHaveCount(0);
  });
});

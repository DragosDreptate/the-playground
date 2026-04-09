import { test, expect } from "@playwright/test";
import { SLUGS } from "./fixtures";

/**
 * Tests E2E — Tabs événements sur la page Communauté
 *
 * Couvre :
 *   - Le changement de tab (à venir / passés) ne scrolle pas en haut de la page
 */

test.describe("Circle page — event tabs scroll", () => {
  // Viewport petite pour garantir que les tabs nécessitent du scroll
  test.use({ viewport: { width: 375, height: 667 } });

  test("switching tabs should not scroll to top", async ({ page }) => {
    await page.goto(`/fr/circles/${SLUGS.CIRCLE}`);

    // Attendre que les tabs soient visibles
    const pastTab = page.getByRole("button", { name: /passé|past/i });
    const upcomingTab = page.getByRole("button", { name: /prochains|upcoming/i });
    await expect(pastTab).toBeVisible();

    // Scroller jusqu'aux tabs avec JS
    await pastTab.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(300);

    // Capturer la position de scroll avant le clic
    const scrollBefore = await page.evaluate(() => window.scrollY);
    expect(scrollBefore).toBeGreaterThan(50);

    // Cliquer sur le tab "événements passés"
    await pastTab.click();
    await page.waitForTimeout(500);

    // Vérifier que la position de scroll n'a pas changé significativement
    const scrollAfterPast = await page.evaluate(() => window.scrollY);
    expect(Math.abs(scrollAfterPast - scrollBefore)).toBeLessThan(50);

    // Re-scroller aux tabs (le contenu peut avoir changé de taille)
    await upcomingTab.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(300);
    const scrollBeforeUpcoming = await page.evaluate(() => window.scrollY);

    // Cliquer sur le tab "prochains événements"
    await upcomingTab.click();
    await page.waitForTimeout(500);

    // Vérifier que la position de scroll n'a toujours pas changé
    const scrollAfterUpcoming = await page.evaluate(() => window.scrollY);
    expect(Math.abs(scrollAfterUpcoming - scrollBeforeUpcoming)).toBeLessThan(50);
  });
});

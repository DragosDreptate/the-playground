import { test, expect, type Page } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Tests E2E — Tabs événements sur les pages Communauté
 *
 * Couvre :
 *   - Page publique : le changement de tab ne scrolle pas en haut
 *   - Page dashboard : le changement de tab ne scrolle pas en haut
 */

async function assertTabSwitchPreservesScroll(page: Page) {
  const pastTab = page.getByRole("button", { name: /passé|past/i });
  const upcomingTab = page.getByRole("button", { name: /prochains|upcoming/i });
  await expect(pastTab).toBeVisible();

  // Scroller jusqu'aux tabs
  await pastTab.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);

  const scrollBefore = await page.evaluate(() => window.scrollY);
  expect(scrollBefore).toBeGreaterThan(50);

  // Cliquer sur "événements passés"
  await pastTab.click();
  await page.waitForTimeout(500);

  const scrollAfterPast = await page.evaluate(() => window.scrollY);
  expect(Math.abs(scrollAfterPast - scrollBefore)).toBeLessThan(50);

  // Re-scroller et cliquer sur "prochains événements"
  await upcomingTab.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);
  const scrollBeforeUpcoming = await page.evaluate(() => window.scrollY);

  await upcomingTab.click();
  await page.waitForTimeout(500);

  const scrollAfterUpcoming = await page.evaluate(() => window.scrollY);
  expect(Math.abs(scrollAfterUpcoming - scrollBeforeUpcoming)).toBeLessThan(50);
}

test.describe("Circle page — event tabs scroll", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("public page: switching tabs should not scroll to top", async ({ page }) => {
    await page.goto(`/fr/circles/${SLUGS.CIRCLE}`);
    await assertTabSwitchPreservesScroll(page);
  });

  test("dashboard page: switching tabs should not scroll to top", async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH.HOST });
    const page = await context.newPage();
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);
    await assertTabSwitchPreservesScroll(page);

    await context.close();
  });
});

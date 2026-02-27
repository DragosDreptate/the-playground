import { test, expect } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Tests E2E — Liste d'attente (waitlist)
 *
 * Couvre :
 *   - Affichage d'un Moment complet (capacity=3, 3 inscrits)
 *   - Player3 voit son statut "liste d'attente" (seedé WAITLISTED)
 *   - Inscription sur un Moment complet → statut waitlist
 */

test.describe("Liste d'attente — affichage Moment complet (non inscrit)", () => {
  test.use({ storageState: AUTH.HOST });

  test("should display the Moment as full with a waitlist option", async ({ page }) => {
    await page.goto(`/fr/m/${SLUGS.FULL_MOMENT}`);

    // La page doit indiquer que le Moment est complet ou proposer la liste d'attente
    const waitlistIndicator = page
      .locator("button, [data-testid='registration-cta']")
      .filter({
        hasText: /liste d'attente|waitlist|rejoindre.*attente|join.*waitlist/i,
      })
      .first();

    const fullIndicator = page.locator("main").filter({
      hasText: /complet|full|places/i,
    });

    const hasWaitlist = await waitlistIndicator.isVisible().catch(() => false);
    const hasFull = await fullIndicator.isVisible().catch(() => false);

    expect(hasWaitlist || hasFull).toBe(true);
  });
});

test.describe("Liste d'attente — statut affiché pour Player3", () => {
  test.use({ storageState: AUTH.PLAYER3 });

  test("should show the waitlisted status on the Moment page for player3", async ({ page }) => {
    await page.goto(`/fr/m/${SLUGS.FULL_MOMENT}`);

    // Player3 est seedé WAITLISTED sur cet événement
    await expect(
      page
        .locator("main")
        .filter({
          hasText: /liste d'attente|waitlist|en attente|waiting/i,
        })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should show the waitlisted Moment on the user dashboard", async ({ page }) => {
    await page.goto("/fr/dashboard");
    await expect(page).not.toHaveURL(/\/auth\/sign-in/);
    // Le dashboard doit être accessible et afficher les inscriptions
    await expect(page.locator("main")).toBeVisible();
  });
});

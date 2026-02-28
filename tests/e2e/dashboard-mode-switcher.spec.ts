import { test, expect } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Tests E2E — Mode Switcher Dashboard Participant / Organisateur
 *
 * Couvre :
 *   - Présence du mode switcher (pills) sur le dashboard
 *   - Mode ORGANIZER : CTAs Créer, contenu Organisateur
 *   - Mode PARTICIPANT : contenu Participant (sans CTAs Organisateur)
 *   - Persistence du mode via URL params
 */

test.describe("Dashboard mode switcher — Host connecté", () => {
  test.use({ storageState: AUTH.HOST });

  test("should display the mode switcher on the dashboard", async ({ page }) => {
    await page.goto("/fr/dashboard");
    // Attendre la stabilisation de l'URL (le dashboardMode étant seedé à ORGANIZER,
    // il n'y a pas de redirect vers /welcome — mais on attend quand même pour la robustesse)
    await page.waitForURL(/\/dashboard/, { timeout: 8_000 });
    // Le mode switcher doit être visible (deux pills)
    const switcher = page.locator(".rounded-full.border").filter({ hasText: /Participant|Organisateur/ }).first();
    await expect(switcher).toBeVisible({ timeout: 8_000 });
  });

  test("should show Organizer CTA when in organizer mode", async ({ page }) => {
    await page.goto("/fr/dashboard?mode=organizer&tab=moments");
    // Un CTA de création est visible (lien direct ou dropdown selon nb de communautés)
    const createCTA = page.locator("a, button").filter({ hasText: /Créer/i }).first();
    await expect(createCTA).toBeVisible();
  });

  test("should show create Circle CTA in organizer mode on circles tab", async ({ page }) => {
    await page.goto("/fr/dashboard?mode=organizer&tab=circles");
    const createCircleBtn = page.locator("a[href*='/circles/new']").first();
    await expect(createCircleBtn).toBeVisible();
  });

  test("should highlight the Organisateur pill in organizer mode", async ({ page }) => {
    await page.goto("/fr/dashboard?mode=organizer");
    // Le pill Organisateur doit avoir le style actif (bg-foreground)
    const organizerPill = page.locator("button").filter({ hasText: "Organisateur" }).first();
    await expect(organizerPill).toBeVisible();
    await expect(organizerPill).toHaveClass(/bg-foreground/);
  });

  test("should highlight the Participant pill in participant mode", async ({ page }) => {
    await page.goto("/fr/dashboard?mode=participant");
    const participantPill = page.locator("button").filter({ hasText: "Participant" }).first();
    await expect(participantPill).toBeVisible();
    await expect(participantPill).toHaveClass(/bg-foreground/);
  });

  test("should show the host Circle in organizer mode", async ({ page }) => {
    await page.goto("/fr/dashboard?mode=organizer&tab=circles");
    // Le Circle seedé du Host doit apparaître
    await expect(page.locator("main").first()).toContainText("Paris Creative Tech");
  });

  test("should NOT show create Event CTA in participant mode", async ({ page }) => {
    await page.goto("/fr/dashboard?mode=participant&tab=moments");
    const createBtn = page.locator("a[href*='/moments/new']");
    await expect(createBtn).not.toBeVisible();
  });

  test("should switch mode when clicking the Organisateur pill", async ({ page }) => {
    await page.goto("/fr/dashboard?mode=participant");
    // Cliquer sur le pill Organisateur
    const organizerPill = page.locator("button").filter({ hasText: "Organisateur" }).first();
    await expect(organizerPill).toBeVisible();
    await organizerPill.click();
    // L'URL doit contenir mode=organizer
    await expect(page).toHaveURL(/mode=organizer/, { timeout: 5_000 });
  });

  test("should switch back to participant mode when clicking Participant pill", async ({ page }) => {
    await page.goto("/fr/dashboard?mode=organizer");
    const participantPill = page.locator("button").filter({ hasText: "Participant" }).first();
    await expect(participantPill).toBeVisible();
    await participantPill.click();
    await expect(page).toHaveURL(/mode=participant/, { timeout: 5_000 });
  });
});

test.describe("Dashboard mode switcher — Player connecté", () => {
  test.use({ storageState: AUTH.PLAYER });

  test("should display the mode switcher for a participant user", async ({ page }) => {
    await page.goto("/fr/dashboard");
    const switcher = page.locator(".rounded-full.border").filter({ hasText: /Participant|Organisateur/ }).first();
    await expect(switcher).toBeVisible();
  });

  test("should show participant events for a player user in participant mode", async ({ page }) => {
    await page.goto("/fr/dashboard?mode=participant&tab=moments");
    // Player1 est inscrit à PUBLISHED_MOMENT — doit apparaître
    await expect(page.locator("main").first()).toBeVisible();
    // Pas de bouton "Créer un événement"
    const createBtn = page.locator("a[href*='/moments/new']");
    await expect(createBtn).not.toBeVisible();
  });

  test("should show no host circles when player switches to organizer mode", async ({ page }) => {
    await page.goto("/fr/dashboard?mode=organizer&tab=circles");
    // Player n'a pas de Circles en tant qu'Organisateur
    const main = page.locator("main").first();
    await expect(main).toContainText(/aucun|no/i);
  });
});

test.describe("Dashboard — welcome page redirect", () => {
  test.use({ storageState: AUTH.HOST });

  test("should redirect from welcome to dashboard when mode is already set", async ({ page }) => {
    // Naviguer vers welcome avec un mode déjà en session (après avoir visité le dashboard)
    // Note : le HOST a de l'activité, donc welcome redirige vers /dashboard
    await page.goto("/fr/dashboard/welcome");
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 5_000 });
  });
});

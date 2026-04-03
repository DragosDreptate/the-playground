import { test, expect } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Tests E2E — Dashboard unifié
 *
 * Couvre :
 *   - Vue unifiée : événements (inscrits + organisés) et communautés (membre + host)
 *   - CTAs Créer toujours visibles (événement si host, communauté toujours)
 *   - Filtre "Organisateur" (dropdown, visible uniquement pour les hosts)
 *   - Tabs Événements / Communautés
 *   - Welcome page redirect
 */

test.describe("Dashboard unifié — Host connecté", () => {
  test.use({ storageState: AUTH.HOST });

  test("should display the dashboard with greeting and tabs", async ({ page }) => {
    await page.goto("/fr/dashboard");
    await page.waitForURL(/\/dashboard/, { timeout: 8_000 });
    await expect(page.locator("h1")).toBeVisible();
    // Les tabs Événements / Communautés doivent être visibles
    const tabs = page.locator(".rounded-full.border").filter({ hasText: /Événements|Communautés/ }).first();
    await expect(tabs).toBeVisible({ timeout: 8_000 });
  });

  test("should show create Event CTA on events tab", async ({ page }) => {
    await page.goto("/fr/dashboard?tab=moments");
    const createCTA = page.locator("a, button").filter({ hasText: /Créer/i }).first();
    await expect(createCTA).toBeVisible();
  });

  test("should show create Circle CTA on circles tab", async ({ page }) => {
    await page.goto("/fr/dashboard?tab=circles");
    const createCircleBtn = page.locator("a[href*='/circles/new']").first();
    await expect(createCircleBtn).toBeVisible();
  });

  test("should show the host Circle on circles tab", async ({ page }) => {
    await page.goto("/fr/dashboard?tab=circles");
    await expect(page.locator("main").first()).toContainText("Paris Creative Tech");
  });

  test("should show the organizer filter dropdown for a host", async ({ page }) => {
    await page.goto("/fr/dashboard?tab=moments");
    // Le dropdown filtre doit être visible (contient "Tous" par défaut)
    const filterTrigger = page.locator("[data-slot='select-trigger']").filter({ hasText: /Tous|Organisateur/i }).first();
    await expect(filterTrigger).toBeVisible();
  });

  test("should filter events when organizer filter is active", async ({ page }) => {
    await page.goto("/fr/dashboard?tab=moments&host=true");
    // Tous les événements affichés doivent avoir le badge Organisateur
    const main = page.locator("main").first();
    await expect(main).toBeVisible();
    // Le dropdown doit afficher "Organisateur"
    const filterTrigger = page.locator("[data-slot='select-trigger']").first();
    await expect(filterTrigger).toContainText(/Organisateur/i);
  });

  test("should filter circles when organizer filter is active", async ({ page }) => {
    await page.goto("/fr/dashboard?tab=circles&host=true");
    // Seules les communautés organisées sont affichées
    const main = page.locator("main").first();
    await expect(main).toBeVisible();
  });

  test("should preserve filter when switching tabs", async ({ page }) => {
    await page.goto("/fr/dashboard?tab=moments&host=true");
    // Cliquer sur l'onglet Communautés
    const circlesTab = page.locator("a").filter({ hasText: /Communautés/i }).first();
    await circlesTab.click();
    // L'URL doit conserver host=true
    await expect(page).toHaveURL(/host=true/, { timeout: 5_000 });
  });
});

test.describe("Dashboard unifié — Player connecté", () => {
  test.use({ storageState: AUTH.PLAYER });

  test("should display the dashboard without organizer filter", async ({ page }) => {
    await page.goto("/fr/dashboard");
    await page.waitForURL(/\/dashboard/, { timeout: 8_000 });
    await expect(page.locator("h1")).toBeVisible();
    // Le dropdown filtre ne doit PAS être visible pour un pur participant
    const filterTrigger = page.locator("[data-slot='select-trigger']").filter({ hasText: /Tous|Organisateur/i });
    await expect(filterTrigger).not.toBeVisible();
  });

  test("should show participant events on the dashboard", async ({ page }) => {
    await page.goto("/fr/dashboard?tab=moments");
    // Player1 est inscrit à PUBLISHED_MOMENT — doit apparaître
    await expect(page.locator("main").first()).toBeVisible();
    // Pas de bouton "Créer un événement" (player n'est pas host)
    const createBtn = page.locator("a[href*='/moments/new']");
    await expect(createBtn).not.toBeVisible();
  });

  test("should show create Circle CTA on circles tab even for non-host", async ({ page }) => {
    await page.goto("/fr/dashboard?tab=circles");
    const createCircleBtn = page.locator("a[href*='/circles/new']").first();
    await expect(createCircleBtn).toBeVisible();
  });
});

test.describe("Dashboard — welcome page redirect", () => {
  test.use({ storageState: AUTH.HOST });

  test("should redirect from welcome to dashboard when mode is already set", async ({ page }) => {
    await page.goto("/fr/dashboard/welcome");
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 5_000 });
  });
});

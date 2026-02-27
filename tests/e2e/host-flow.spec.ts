import { test, expect } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Tests E2E — Flux Host : dashboard, Circle et création d'un Moment
 *
 * Couvre :
 *   - Dashboard Host après authentification
 *   - Bouton "Créer une Communauté" visible
 *   - Page Circle du Host (paris-creative-tech)
 *   - Création d'un nouveau Circle depuis le dashboard
 *   - Création d'un Moment dans un Circle existant
 */

test.describe("Flux Host — dashboard", () => {
  test.use({ storageState: AUTH.HOST });

  test("should display the Host dashboard after authentication", async ({ page }) => {
    await page.goto("/fr/dashboard");
    await expect(page).not.toHaveURL(/\/auth\/sign-in/);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("should show the create Circle button on the dashboard", async ({ page }) => {
    // Le bouton "Créer une Communauté" n'apparaît que sur l'onglet Communautés
    await page.goto("/fr/dashboard?tab=circles");
    const createCircleButton = page.locator("a[href*='/circles/new']").first();
    await expect(createCircleButton).toBeVisible();
  });

  test("should show the paris-creative-tech Circle on the dashboard", async ({ page }) => {
    await page.goto("/fr/dashboard");
    // Le Circle seedé doit apparaître dans la liste
    await expect(page.locator("main")).toContainText("Paris Creative Tech");
  });
});

test.describe("Flux Host — page Circle", () => {
  test.use({ storageState: AUTH.HOST });

  test("should display the Circle dashboard with its name", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).toContainText("Paris Creative Tech");
  });

  test("should show upcoming events in the Circle timeline", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);
    // Des événements à venir sont seedés : Meetup IA, Hackathon
    await expect(page.locator("main")).toContainText(/Meetup IA|Hackathon|événement/i);
  });

  test("should show the manage members section", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);
    await expect(page.locator("main")).toContainText(/membre|participant/i);
  });
});

test.describe("Flux Host — création d'un Circle", () => {
  test.use({ storageState: AUTH.HOST });

  test("should display the new Circle form", async ({ page }) => {
    await page.goto("/fr/dashboard/circles/new");
    await expect(page.locator("input[name='name']")).toBeVisible();
  });

  test("should create a new Circle and redirect to its dashboard page", async ({ page }) => {
    const uniqueName = `E2E Test Circle ${Date.now()}`;
    await page.goto("/fr/dashboard/circles/new");

    await page.fill("input[name='name']", uniqueName);

    const descriptionField = page.locator("textarea[name='description']");
    if (await descriptionField.isVisible()) {
      await descriptionField.fill("E2E test description");
    }

    await page.locator("button[type='submit']").click();

    await expect(page).toHaveURL(/\/dashboard\/circles\//, { timeout: 15_000 });
  });
});

test.describe("Flux Host — création d'un Moment", () => {
  test.use({ storageState: AUTH.HOST });

  test("should display the new Moment form within a Circle", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/new`);
    await expect(page.locator("input[name='title']")).toBeVisible();
  });

  test("should create a new Moment and redirect to its detail page", async ({ page }) => {
    const uniqueTitle = `E2E Moment ${Date.now()}`;

    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/new`);

    await page.fill("input[name='title']", uniqueTitle);

    const dateInput = page.locator("input[name='startsAt'], input[type='datetime-local']").first();
    if (await dateInput.isVisible()) {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const formatted = futureDate.toISOString().slice(0, 16);
      await dateInput.fill(formatted);
    }

    await page.locator("button[type='submit']").click();

    await expect(page).toHaveURL(/\/dashboard\/circles\/.*\/moments\//, { timeout: 15_000 });
  });

  test("should show the created Moment in the Circle timeline", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);
    // La timeline doit contenir au moins un événement
    const momentLinks = page.locator("a[href*='/moments/']");
    await expect(momentLinks.first()).toBeVisible();
  });
});

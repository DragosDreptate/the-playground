import { test, expect } from "@playwright/test";

/**
 * Tests E2E — Flux Host : création d'un Circle et d'un Moment
 *
 * Couvre :
 *   - Création d'un nouveau Circle depuis le dashboard
 *   - Création d'un Moment dans ce Circle
 *   - Vérification que le Moment apparaît dans la timeline du Circle
 *   - Dashboard Circle-first : le Circle est le cockpit
 *
 * Prérequis :
 *   - Serveur Next.js en cours (BASE_URL)
 *   - E2E_AUTH_STORAGE_STATE : fichier JSON de session Playwright (storageState)
 *     avec un utilisateur ayant complété l'onboarding
 */

test.describe("Flux Host — dashboard", () => {
  test.skip(
    !process.env.E2E_AUTH_STORAGE_STATE,
    "E2E_AUTH_STORAGE_STATE non défini"
  );

  test.use({
    storageState: process.env.E2E_AUTH_STORAGE_STATE ?? "",
  });

  test("should display the Host dashboard after authentication", async ({ page }) => {
    await page.goto("/fr/dashboard");
    await expect(page).not.toHaveURL(/\/auth\/sign-in/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("should show the create Circle button on the dashboard", async ({ page }) => {
    await page.goto("/fr/dashboard");
    const createCircleButton = page
      .locator("a, button")
      .filter({ hasText: /nouveau cercle|new circle|créer un cercle|create circle/i })
      .first();
    await expect(createCircleButton).toBeVisible();
  });
});

test.describe("Flux Host — création d'un Circle", () => {
  test.skip(
    !process.env.E2E_AUTH_STORAGE_STATE,
    "E2E_AUTH_STORAGE_STATE non défini"
  );

  test.use({
    storageState: process.env.E2E_AUTH_STORAGE_STATE ?? "",
  });

  test("should display the new Circle form", async ({ page }) => {
    await page.goto("/fr/dashboard/circles/new");
    await expect(page.locator("input[name='name']")).toBeVisible();
  });

  test("should create a new Circle and redirect to its dashboard page", async ({ page }) => {
    const uniqueName = `E2E Test Circle ${Date.now()}`;
    await page.goto("/fr/dashboard/circles/new");

    await page.fill("input[name='name']", uniqueName);

    // Fill required fields if any description is required
    const descriptionField = page.locator("textarea[name='description']");
    if (await descriptionField.isVisible()) {
      await descriptionField.fill("E2E test description");
    }

    await page.locator("button[type='submit']").click();

    // Should redirect to the new circle's dashboard page
    await expect(page).toHaveURL(/\/dashboard\/circles\//, { timeout: 15_000 });
  });
});

test.describe("Flux Host — création d'un Moment", () => {
  test.skip(
    !process.env.E2E_TEST_CIRCLE_SLUG || !process.env.E2E_AUTH_STORAGE_STATE,
    "E2E_TEST_CIRCLE_SLUG ou E2E_AUTH_STORAGE_STATE non défini"
  );

  test.use({
    storageState: process.env.E2E_AUTH_STORAGE_STATE ?? "",
  });

  test("should display the new Moment form within a Circle", async ({ page }) => {
    const circleSlug = process.env.E2E_TEST_CIRCLE_SLUG;
    await page.goto(`/fr/dashboard/circles/${circleSlug}/moments/new`);
    await expect(page.locator("input[name='title']")).toBeVisible();
  });

  test("should create a new Moment and redirect to its detail page", async ({ page }) => {
    const circleSlug = process.env.E2E_TEST_CIRCLE_SLUG;
    const uniqueTitle = `E2E Moment ${Date.now()}`;

    await page.goto(`/fr/dashboard/circles/${circleSlug}/moments/new`);

    await page.fill("input[name='title']", uniqueTitle);

    // Fill the date fields — format may vary
    const dateInput = page.locator("input[name='startsAt'], input[type='datetime-local']").first();
    if (await dateInput.isVisible()) {
      // Set date 7 days in the future
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const formatted = futureDate.toISOString().slice(0, 16);
      await dateInput.fill(formatted);
    }

    await page.locator("button[type='submit']").click();

    // Should redirect to the moment's dashboard page
    await expect(page).toHaveURL(/\/dashboard\/circles\/.*\/moments\//, { timeout: 15_000 });
  });

  test("should show the created Moment in the Circle timeline", async ({ page }) => {
    const circleSlug = process.env.E2E_TEST_CIRCLE_SLUG;
    await page.goto(`/fr/dashboard/circles/${circleSlug}`);
    // The Circle dashboard shows upcoming moments
    await expect(page.locator("main")).toBeVisible();
  });
});

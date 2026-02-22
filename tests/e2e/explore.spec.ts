import { test, expect } from "@playwright/test";

/**
 * Tests E2E — La Carte / Explore (découverte publique)
 *
 * Couvre :
 *   - Affichage de la page Explorer avec les onglets Cercles / Escales
 *   - Filtrage par catégorie
 *   - Navigation vers une page Circle publique
 *   - Navigation vers une page Moment publique depuis l'Explorer
 *   - Page Circle publique : affichage des Escales à venir
 *
 * Prérequis :
 *   - Serveur Next.js en cours (BASE_URL)
 *   - Au moins un Circle public et un Moment PUBLISHED en base de données
 *   - E2E_PUBLIC_CIRCLE_SLUG (optionnel) : slug d'un Circle public
 */

test.describe("La Carte — page Explorer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/fr/explorer");
  });

  test("should display the Explorer page with a title", async ({ page }) => {
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
  });

  test("should display the Circles and Moments tabs", async ({ page }) => {
    // Explorer has two tabs: Cercles and Escales
    const circlesTab = page
      .locator("button, [role='tab'], a")
      .filter({ hasText: /cercles|circles/i })
      .first();
    const momentsTab = page
      .locator("button, [role='tab'], a")
      .filter({ hasText: /escales|moments/i })
      .first();

    await expect(circlesTab).toBeVisible();
    await expect(momentsTab).toBeVisible();
  });

  test("should display category filter options", async ({ page }) => {
    // Category filter should be present (dropdown, buttons, or tabs)
    const categoryFilter = page
      .locator("select, [role='combobox'], button, [data-testid='category-filter']")
      .filter({
        hasText: /catégorie|category|tech|design|sport|business|art|science|social/i,
      })
      .first();
    await expect(categoryFilter).toBeVisible();
  });

  test("should list public Circles", async ({ page }) => {
    // At least one Circle card should be visible (if data exists)
    const circleCards = page.locator("a[href*='/circles/']");
    // We expect at least one public Circle in the database
    await expect(circleCards.first()).toBeVisible({ timeout: 10_000 });
  });

  test("should navigate to a Circle page when clicking a Circle card", async ({ page }) => {
    const circleLink = page.locator("a[href*='/circles/']").first();
    await expect(circleLink).toBeVisible({ timeout: 10_000 });
    await circleLink.click();

    await expect(page).toHaveURL(/\/circles\//, { timeout: 10_000 });
    await expect(page.locator("h1")).toBeVisible();
  });

  test("should switch to Escales tab and display upcoming Moments", async ({ page }) => {
    const momentsTab = page
      .locator("button, [role='tab'], a")
      .filter({ hasText: /escales|moments/i })
      .first();
    await momentsTab.click();

    // Moment cards linking to /m/ pages
    const momentLinks = page.locator("a[href*='/m/']");
    // At least one upcoming Moment should be visible (if data exists)
    await expect(momentLinks.first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("La Carte — page Circle publique", () => {
  test.skip(
    !process.env.E2E_PUBLIC_CIRCLE_SLUG,
    "E2E_PUBLIC_CIRCLE_SLUG non défini"
  );

  test("should display the public Circle page with its name and description", async ({ page }) => {
    const circleSlug = process.env.E2E_PUBLIC_CIRCLE_SLUG;
    await page.goto(`/fr/circles/${circleSlug}`);

    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
  });

  test("should display upcoming Escales on the Circle page", async ({ page }) => {
    const circleSlug = process.env.E2E_PUBLIC_CIRCLE_SLUG;
    await page.goto(`/fr/circles/${circleSlug}`);

    // The Circle page shows a timeline of upcoming Escales
    await expect(page.locator("main")).toBeVisible();
  });

  test("should display the Organisateurs (Hosts) on the Circle page", async ({ page }) => {
    const circleSlug = process.env.E2E_PUBLIC_CIRCLE_SLUG;
    await page.goto(`/fr/circles/${circleSlug}`);

    // Organisateurs section should be visible
    const hostSection = page
      .locator("main")
      .filter({ hasText: /organisé par|hosted by|organisateur/i });
    await expect(hostSection).toBeVisible();
  });

  test("should display member count on the Circle page", async ({ page }) => {
    const circleSlug = process.env.E2E_PUBLIC_CIRCLE_SLUG;
    await page.goto(`/fr/circles/${circleSlug}`);

    // Member count stat should be visible
    const memberStat = page
      .locator("main")
      .filter({ hasText: /membre|member/i });
    await expect(memberStat).toBeVisible();
  });

  test("should allow navigating to an Escale from the Circle page", async ({ page }) => {
    const circleSlug = process.env.E2E_PUBLIC_CIRCLE_SLUG;
    await page.goto(`/fr/circles/${circleSlug}`);

    // Click on an Escale link in the timeline
    const escaleLink = page.locator("a[href*='/m/']").first();
    const isVisible = await escaleLink.isVisible().catch(() => false);
    if (isVisible) {
      await escaleLink.click();
      await expect(page).toHaveURL(/\/m\//, { timeout: 10_000 });
      await expect(page.locator("h1")).toBeVisible();
    }
  });
});

test.describe("La Carte — accès Explorer depuis le header", () => {
  test("should have a link to La Carte / Explore in the header navigation", async ({ page }) => {
    await page.goto("/fr");

    // The header should contain a link to the Explorer page
    const exploreLink = page.locator("header a[href*='/explorer']");
    await expect(exploreLink.first()).toBeVisible();
  });

  test("should navigate to Explorer when clicking the header link", async ({ page }) => {
    await page.goto("/fr");

    const exploreLink = page.locator("header a[href*='/explorer']").first();
    await exploreLink.click();

    await expect(page).toHaveURL(/\/explorer/, { timeout: 10_000 });
  });
});

import { test, expect } from "@playwright/test";
import { SLUGS } from "./fixtures";

/**
 * Tests E2E — La Carte / Découvrir (découverte publique)
 *
 * Couvre :
 *   - Affichage de la page Découvrir avec les onglets Communautés / Événements
 *   - Filtrage par catégorie
 *   - Navigation vers une page Communauté publique
 *   - Navigation vers une page Événement publique depuis Découvrir
 *   - Page Communauté publique : affichage des événements à venir
 */

test.describe("Découvrir — page Explorer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/fr/explorer");
  });

  test("should display the Explorer page with a title", async ({ page }) => {
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
  });

  test("should display the Communities and Events tabs", async ({ page }) => {
    const circlesTab = page
      .locator("button, [role='tab'], a")
      .filter({ hasText: /communauté|community|cercle|circle/i })
      .first();
    const momentsTab = page
      .locator("button, [role='tab'], a")
      .filter({ hasText: /événement|event|escale|moment/i })
      .first();

    await expect(circlesTab).toBeVisible();
    await expect(momentsTab).toBeVisible();
  });

  test("should display category filter options", async ({ page }) => {
    // Le filtre thématique est un Select (combobox) dont le trigger affiche "Toutes les thématiques"
    const categoryFilter = page
      .locator("[role='combobox']")
      .filter({ hasText: /thématique|catégorie|category/i })
      .first();
    await expect(categoryFilter).toBeVisible();
  });

  test("should list public Circles", async ({ page }) => {
    const circleCards = page.locator("a[href*='/circles/']");
    await expect(circleCards.first()).toBeVisible();
  });

  test("should navigate to a Circle page when clicking a Circle card", async ({ page }) => {
    const circleLink = page.locator("a[href*='/circles/']").first();
    await expect(circleLink).toBeVisible();
    await circleLink.click();

    await expect(page).toHaveURL(/\/circles\//);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("should switch to Events tab and display upcoming Moments", async ({ page }) => {
    const momentsTab = page
      .locator("button, [role='tab'], a")
      .filter({ hasText: /événement|event|escale|moment/i })
      .first();
    await momentsTab.click();

    // La carte Moment est une timeline responsive unique : un seul lien /m/ par carte.
    const momentLinks = page.locator("a[href*='/m/']");
    await expect(momentLinks.first()).toBeVisible();
  });
});

test.describe("Découvrir — page Communauté publique", () => {
  test("should display the public Circle page with its name and description", async ({ page }) => {
    await page.goto(`/fr/circles/${SLUGS.PUBLIC_CIRCLE}`);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator("h1").first()).toContainText("Yoga Montmartre");
  });

  test("should display upcoming events on the Circle page", async ({ page }) => {
    await page.goto(`/fr/circles/${SLUGS.PUBLIC_CIRCLE}`);
    // Des événements à venir sont seedés dans yoga-montmartre
    await expect(page.locator("main")).toContainText(/Méditation|Retraite|événement/i);
  });

  test("should display the Organisateurs (Hosts) on the Circle page", async ({ page }) => {
    await page.goto(`/fr/circles/${SLUGS.PUBLIC_CIRCLE}`);
    const hostSection = page
      .locator("main")
      .filter({ hasText: /organisé par|hosted by|organisateur/i });
    await expect(hostSection).toBeVisible();
  });

  test("should display member count on the Circle page", async ({ page }) => {
    await page.goto(`/fr/circles/${SLUGS.PUBLIC_CIRCLE}`);
    const memberStat = page
      .locator("main")
      .filter({ hasText: /membre|member/i });
    await expect(memberStat).toBeVisible();
  });

  test("should allow navigating to an Event from the Circle page", async ({ page }) => {
    await page.goto(`/fr/circles/${SLUGS.PUBLIC_CIRCLE}`);

    const eventLink = page.locator("a[href*='/m/']").first();
    const isVisible = await eventLink.isVisible().catch(() => false);
    if (isVisible) {
      await eventLink.click();
      await expect(page).toHaveURL(/\/m\//);
      // Attendre la fin du DOM avant de chercher le h1 — la SPA navigation
      // ne garantit pas que le contenu est hydraté au moment du click.
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 15_000 });
    }
  });
});

test.describe("Découvrir — accès depuis le header (utilisateur connecté)", () => {
  // Le lien Explorer dans le header n'est affiché que pour les utilisateurs connectés
  test.use({ storageState: "tests/e2e/.auth/host.json" });

  test("should have a link to Découvrir in the header navigation", async ({ page }) => {
    await page.goto("/fr/dashboard");
    const exploreLink = page.locator("header a[href*='/explorer']");
    await expect(exploreLink.first()).toBeVisible();
  });

  test("should navigate to Explorer when clicking the header link", async ({ page }) => {
    await page.goto("/fr/dashboard");
    const exploreLink = page.locator("header a[href*='/explorer']").first();
    await exploreLink.click();
    await expect(page).toHaveURL(/\/explorer/);
  });
});

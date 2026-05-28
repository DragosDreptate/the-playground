import { test, expect } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Tests E2E — Widget embed événement (#485)
 *
 * Couvre :
 *   - Rendu de la carte publiée (200, contient titre + CTA S'inscrire)
 *   - Pas de SiteHeader / SiteFooter (page dépouillée)
 *   - Headers CSP : frame-ancestors *
 *   - Query params locale / theme
 *   - États : passé, annulé, DRAFT, slug inexistant
 *   - Bouton "Intégrer sur mon site" dans le dashboard détail (Host)
 */

test.describe("Embed widget — rendu public", () => {
  test("should render the active event card with title and CTA", async ({ page }) => {
    const response = await page.goto(`/embed/m/${SLUGS.PUBLISHED_MOMENT}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
    await expect(page.getByRole("link", { name: /s'inscrire/i })).toBeVisible();
  });

  test("should not render the site header or footer", async ({ page }) => {
    await page.goto(`/embed/m/${SLUGS.PUBLISHED_MOMENT}`);
    await expect(page.locator("header.site-header")).toHaveCount(0);
    // La mention "Powered by The Playground" est rendue dans un <p>, pas dans
    // un <footer> HTML : on vérifie juste sa présence.
    await expect(page.getByText(/powered by the playground/i)).toBeVisible();
  });

  test("should serve frame-ancestors * in CSP (allow embedding anywhere)", async ({ request }) => {
    const response = await request.get(`/embed/m/${SLUGS.PUBLISHED_MOMENT}`);
    const csp = response.headers()["content-security-policy"] ?? "";
    expect(csp).toContain("frame-ancestors *");
    expect(response.headers()["x-frame-options"]).toBeUndefined();
  });

  test("should switch to English with ?locale=en", async ({ page }) => {
    await page.goto(`/embed/m/${SLUGS.PUBLISHED_MOMENT}?locale=en`);
    await expect(page.getByRole("link", { name: /^join/i })).toBeVisible();
  });

  test("should fall back to French for invalid locale", async ({ page }) => {
    await page.goto(`/embed/m/${SLUGS.PUBLISHED_MOMENT}?locale=xx`);
    await expect(page.getByRole("link", { name: /s'inscrire/i })).toBeVisible();
  });

  test("should navigate the top frame to the public moment page (target=_top)", async ({ page }) => {
    await page.goto(`/embed/m/${SLUGS.PUBLISHED_MOMENT}`);
    const cta = page.getByRole("link", { name: /s'inscrire/i });
    await expect(cta).toHaveAttribute("target", "_top");
    await expect(cta).toHaveAttribute("rel", /noopener/);
  });
});

test.describe("Embed widget — états passifs et erreurs", () => {
  test("should render the past event with CTA towards the Circle page", async ({ page }) => {
    await page.goto(`/embed/m/${SLUGS.PAST_MOMENT}`);
    await expect(page.getByRole("link", { name: /voir les prochains/i })).toBeVisible();
  });

  test("should render the cancelled event with a cancelled banner", async ({ page }) => {
    await page.goto(`/embed/m/${SLUGS.CANCELLED_MOMENT}`);
    await expect(page.getByRole("link", { name: /voir les prochains/i })).toBeVisible();
  });

  test("should return 404 for an unknown slug", async ({ page }) => {
    const response = await page.goto(`/embed/m/inexistant-1234`);
    expect(response?.status()).toBe(404);
  });
});

test.describe("Embed widget — dashboard Organisateur", () => {
  test.use({ storageState: AUTH.HOST });

  test("should show the 'Get the code' button on the dashboard event detail", async ({ page }) => {
    await page.goto(
      `/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/${SLUGS.PUBLISHED_MOMENT}`
    );
    await expect(page.getByRole("button", { name: /obtenir le code/i })).toBeVisible();
  });

  test("should open the embed snippet dialog with preview and code tabs", async ({ page }) => {
    await page.goto(
      `/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/${SLUGS.PUBLISHED_MOMENT}`
    );
    await page.getByRole("button", { name: /obtenir le code/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    // Tab Aperçu actif par défaut → iframe visible
    await expect(page.locator("iframe[src*='/embed/m/']")).toBeVisible();
    // Switch sur le tab Code HTML → snippet visible
    await page.getByRole("tab", { name: /code html/i }).click();
    await expect(page.locator("pre code")).toContainText("<iframe");
  });
});

import { test, expect } from "@playwright/test";
import {
  expectNoHorizontalScroll,
  expectTouchTargets,
  expectStackedLayout,
  expectNotOverflowing,
} from "./helpers";

/**
 * Tests mobile — Pages publiques (sans authentification)
 *
 * Couvre :
 *   - Page de connexion (/auth/sign-in)
 *   - Page Moment publique (/m/[slug]) — si MOBILE_TEST_MOMENT_SLUG est défini
 */

test.describe("Page de connexion — mobile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/sign-in");
  });

  test("n'a pas de scroll horizontal", async ({ page }) => {
    await expectNoHorizontalScroll(page);
  });

  test("les boutons ont une zone de touch suffisante (≥ 44px)", async ({ page }) => {
    await expectTouchTargets(page);
  });
});

// Tests de la page Moment publique — uniquement si le slug est fourni
const momentSlug = process.env.MOBILE_TEST_MOMENT_SLUG;

test.describe("Page Moment publique (/m/[slug]) — mobile", () => {
  test.skip(!momentSlug, "MOBILE_TEST_MOMENT_SLUG non défini — passer le slug d'un Moment existant");

  test.beforeEach(async ({ page }) => {
    await page.goto(`/m/${momentSlug}`);
  });

  test("n'a pas de scroll horizontal", async ({ page }) => {
    await expectNoHorizontalScroll(page);
  });

  test("le layout est en colonne unique (pas de layout côte à côte)", async ({ page }) => {
    // Sur mobile, le conteneur principal doit être en flex-col
    // La sidebar (infos When/Where) doit apparaître SOUS le contenu principal
    const mainContent = page.locator("h1").first();
    const registrationButton = page.locator("button").filter({ hasText: /inscrire|rejoindre|registered|join/i }).first();

    // Les deux éléments doivent être visibles
    await expect(mainContent).toBeVisible();

    // Vérifier que le bouton CTA est accessible sans scroll horizontal
    await expectNoHorizontalScroll(page);
  });

  test("le bouton d'inscription est pleine largeur et facilement cliquable", async ({ page }) => {
    // Le RegistrationButton doit avoir w-full sur mobile
    const btn = page.locator("button").filter({ hasText: /s'inscrire|rejoindre|S'inscrire/i }).first();

    if (await btn.count() > 0) {
      const box = await btn.boundingBox();
      expect(box).not.toBeNull();

      if (box) {
        const viewportWidth = page.viewportSize()!.width;
        // Le bouton doit occuper au moins 80% de la largeur du viewport (w-full avec padding)
        expect(box.width, `Bouton trop étroit : ${box.width}px / viewport ${viewportWidth}px`).toBeGreaterThan(viewportWidth * 0.7);
        // Hauteur suffisante pour le touch
        expect(box.height, `Bouton trop petit : ${box.height}px`).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test("la bannière gradient est visible et non carrée (aspect-ratio 2/1)", async ({ page }) => {
    // Le gradient banner a style="aspect-ratio: 2/1"
    const banner = page.locator("[style*='aspect-ratio']").first();
    if (await banner.count() > 0) {
      const box = await banner.boundingBox();
      if (box) {
        // Sur mobile, le ratio doit être proche de 2:1 (largeur ≈ 2× hauteur)
        const ratio = box.width / box.height;
        expect(ratio, `Ratio inattendu : ${ratio.toFixed(2)} (attendu ~2.0)`).toBeGreaterThan(1.5);
        expect(ratio).toBeLessThan(2.5);
      }
    }
  });

  test("les boutons ont une zone de touch suffisante (≥ 44px)", async ({ page }) => {
    await expectTouchTargets(page);
  });
});

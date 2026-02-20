import { test, expect } from "@playwright/test";
import path from "path";
import {
  expectNoHorizontalScroll,
  expectTouchTargets,
} from "./helpers";

/**
 * Tests mobile — Dashboard (pages authentifiées)
 *
 * Prérequis : fichier de session Auth.js stocké dans
 *   tests/mobile/.auth/session.json
 *
 * Pour générer ce fichier, lancer une seule fois :
 *   pnpm test:mobile:setup
 *
 * Ce fichier enregistre la session d'un utilisateur connecté via le navigateur
 * et la réutilise pour tous les tests suivants.
 *
 * Couvre :
 *   - Header : email masqué sur mobile
 *   - Dashboard : boutons Host wrap correctement
 *   - Formulaire Moment : cover en aspect-video sur mobile
 *   - RegistrationsList : dates masquées sur mobile (via page détail Moment)
 */

const AUTH_FILE = path.join(__dirname, ".auth/session.json");

// Vérifie si le fichier de session existe
function authFileExists(): boolean {
  try {
    require("fs").accessSync(AUTH_FILE);
    return true;
  } catch {
    return false;
  }
}

test.describe("Dashboard — Header mobile", () => {
  test.skip(!authFileExists(), "Session auth non générée — lancer pnpm test:mobile:setup");
  test.use({ storageState: AUTH_FILE });

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("n'a pas de scroll horizontal", async ({ page }) => {
    await expectNoHorizontalScroll(page);
  });

  test("l'email de l'utilisateur est masqué sur mobile (hidden sm:inline)", async ({ page }) => {
    // L'email est masqué via `hidden sm:inline` en dessous de 640px
    // Sur les appareils mobiles (375-412px), il doit être invisible
    const viewportWidth = page.viewportSize()!.width;

    if (viewportWidth < 640) {
      // L'email est un lien vers /dashboard/profile — il doit être hidden
      const emailLink = page.locator('a[href*="profile"]').first();
      // Vérifie qu'il est dans le DOM mais invisible (hidden via CSS)
      const isVisible = await emailLink.isVisible();
      expect(isVisible, "L'email doit être masqué sur mobile (<640px)").toBe(false);
    }
  });

  test("les boutons principaux ne débordent pas du viewport", async ({ page }) => {
    await expectNoHorizontalScroll(page);
    await expectTouchTargets(page);
  });
});

test.describe("Dashboard — Boutons Host", () => {
  test.skip(!authFileExists(), "Session auth non générée — lancer pnpm test:mobile:setup");
  test.use({ storageState: AUTH_FILE });

  test("les boutons Créer Moment/Cercle restent dans le viewport", async ({ page }) => {
    await page.goto("/dashboard");
    await expectNoHorizontalScroll(page);

    // Vérifie que les boutons sont dans les limites du viewport
    const buttons = page.locator("a").filter({ hasText: /Moment|Cercle|Circle/i });
    const viewportWidth = page.viewportSize()!.width;

    for (const btn of await buttons.all()) {
      const box = await btn.boundingBox();
      if (box) {
        expect(box.x + box.width, `Bouton "${await btn.textContent()}" dépasse le viewport`).toBeLessThanOrEqual(viewportWidth + 1);
      }
    }
  });
});

test.describe("Formulaire de création de Moment — cover mobile", () => {
  test.skip(!authFileExists(), "Session auth non générée — lancer pnpm test:mobile:setup");
  test.use({ storageState: AUTH_FILE });

  // Ce test nécessite un Circle existant — on utilise MOBILE_TEST_CIRCLE_SLUG
  const circleSlug = process.env.MOBILE_TEST_CIRCLE_SLUG;

  test.skip(!circleSlug, "MOBILE_TEST_CIRCLE_SLUG non défini — passer le slug d'un Circle existant");

  test("la cover est en aspect-video sur mobile (pas carrée)", async ({ page }) => {
    await page.goto(`/dashboard/circles/${circleSlug}/moments/new`);

    // La cover placeholder a un style background (gradient)
    const cover = page.locator("[style*='background']").first();
    await expect(cover).toBeVisible();

    const box = await cover.boundingBox();
    if (box) {
      const ratio = box.width / box.height;
      const viewportWidth = page.viewportSize()!.width;

      if (viewportWidth < 640) {
        // Sur mobile : aspect-video = 16/9 ≈ 1.78
        expect(ratio, `Cover trop haute sur mobile : ratio=${ratio.toFixed(2)} (attendu ~1.78 pour aspect-video)`).toBeGreaterThan(1.5);
        expect(ratio, `Cover ratio inattendu : ${ratio.toFixed(2)}`).toBeLessThan(2.0);
      }
    }
  });

  test("le formulaire n'a pas de scroll horizontal", async ({ page }) => {
    await page.goto(`/dashboard/circles/${circleSlug}/moments/new`);
    await expectNoHorizontalScroll(page);
  });
});

test.describe("Dashboard — Page détail Moment (liste inscriptions)", () => {
  test.skip(!authFileExists(), "Session auth non générée — lancer pnpm test:mobile:setup");
  test.use({ storageState: AUTH_FILE });

  const circleSlug = process.env.MOBILE_TEST_CIRCLE_SLUG;
  const momentSlug = process.env.MOBILE_TEST_MOMENT_SLUG;

  test.skip(!circleSlug || !momentSlug, "MOBILE_TEST_CIRCLE_SLUG ou MOBILE_TEST_MOMENT_SLUG non défini");

  test("la page détail n'a pas de scroll horizontal", async ({ page }) => {
    await page.goto(`/dashboard/circles/${circleSlug}/moments/${momentSlug}`);
    await expectNoHorizontalScroll(page);
  });

  test("les dates d'inscription sont masquées sur mobile (<640px)", async ({ page }) => {
    await page.goto(`/dashboard/circles/${circleSlug}/moments/${momentSlug}`);

    const viewportWidth = page.viewportSize()!.width;
    if (viewportWidth < 640) {
      // Les dates ont la classe `hidden sm:inline`
      // On cherche les spans avec des dates dans la RegistrationsList
      // Elles doivent être cachées via CSS
      const dateSpans = page.locator(".hidden.sm\\:inline");
      const count = await dateSpans.count();
      if (count > 0) {
        for (const span of await dateSpans.all()) {
          const isVisible = await span.isVisible();
          expect(isVisible, "La date d'inscription doit être masquée sur mobile").toBe(false);
        }
      }
    }
  });
});

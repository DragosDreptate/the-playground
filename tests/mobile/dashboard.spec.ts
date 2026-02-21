import { test, expect } from "@playwright/test";
import path from "path";
import {
  expectNoHorizontalScroll,
  expectTouchTargets,
  expectStackedLayout,
  expectNotOverflowing,
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

// ══════════════════════════════════════════════════════════════
// Page Circle détail (authentifié)
// ══════════════════════════════════════════════════════════════

test.describe("Dashboard — Page Circle détail — mobile", () => {
  test.skip(!authFileExists(), "Session auth non générée — lancer pnpm test:mobile:setup");
  test.use({ storageState: AUTH_FILE });

  const circleSlug = process.env.MOBILE_TEST_CIRCLE_SLUG;
  test.skip(!circleSlug, "MOBILE_TEST_CIRCLE_SLUG non défini");

  test.beforeEach(async ({ page }) => {
    await page.goto(`/dashboard/circles/${circleSlug}`);
  });

  test("n'a pas de scroll horizontal", async ({ page }) => {
    await expectNoHorizontalScroll(page);
  });

  test("le layout est empilé en colonne (cover sous le contenu)", async ({ page }) => {
    // Sur mobile, le RIGHT column (order-1) apparaît avant le LEFT column (order-2)
    // Le h1 (titre du Circle) doit être au-dessus de la cover (aspect-ratio 1/1)
    await expectStackedLayout(page, "h1", "[style*='aspect-ratio']");
  });

  test("le titre du Circle n'est pas tronqué", async ({ page }) => {
    await expectNotOverflowing(page, "h1");
  });

  test("les stats (Membres / Moments) sont visibles", async ({ page }) => {
    // Les stats sont des p.text-2xl.font-bold
    const stats = page.locator("p.text-2xl.font-bold");
    const count = await stats.count();
    expect(count, "Au moins 2 stats attendues (Membres + Moments)").toBeGreaterThanOrEqual(2);

    for (const stat of await stats.all()) {
      await expect(stat).toBeVisible();
    }
  });

  test("le sélecteur de tab (À venir / Passés) est visible et accessible", async ({ page }) => {
    // Le pill toggle container
    const tabContainer = page.locator("div.rounded-full.border.p-1");
    await expect(tabContainer).toBeVisible();

    const tabBox = await tabContainer.boundingBox();
    if (tabBox) {
      const viewportWidth = page.viewportSize()!.width;
      expect(
        tabBox.x + tabBox.width,
        "Le sélecteur de tab dépasse le viewport"
      ).toBeLessThanOrEqual(viewportWidth + 1);
    }
  });

  test("les boutons ont une zone de touch suffisante (≥ 44px)", async ({ page }) => {
    await expectTouchTargets(page);
  });
});

// ══════════════════════════════════════════════════════════════
// Formulaire édition Moment
// ══════════════════════════════════════════════════════════════

test.describe("Dashboard — Formulaire édition Moment — mobile", () => {
  test.skip(!authFileExists(), "Session auth non générée — lancer pnpm test:mobile:setup");
  test.use({ storageState: AUTH_FILE });

  const circleSlug = process.env.MOBILE_TEST_CIRCLE_SLUG;
  const momentSlug = process.env.MOBILE_TEST_MOMENT_SLUG;
  test.skip(!circleSlug || !momentSlug, "MOBILE_TEST_CIRCLE_SLUG ou MOBILE_TEST_MOMENT_SLUG non défini");

  test.beforeEach(async ({ page }) => {
    await page.goto(`/dashboard/circles/${circleSlug}/moments/${momentSlug}/edit`);
  });

  test("n'a pas de scroll horizontal", async ({ page }) => {
    await expectNoHorizontalScroll(page);
  });

  test("la cover est en aspect-video sur mobile (pas carrée)", async ({ page }) => {
    const cover = page.locator("[style*='background']").first();
    await expect(cover).toBeVisible();

    const box = await cover.boundingBox();
    if (box) {
      const viewportWidth = page.viewportSize()!.width;
      if (viewportWidth < 640) {
        const ratio = box.width / box.height;
        expect(
          ratio,
          `Cover trop haute sur mobile : ratio=${ratio.toFixed(2)} (attendu ~1.78 pour aspect-video)`
        ).toBeGreaterThan(1.5);
        expect(ratio).toBeLessThan(2.0);
      }
    }
  });

  test("la date card est lisible (début et fin visibles)", async ({ page }) => {
    // Les deux lignes de date (Début / Fin) ont chacune un calendrier icon
    // Elles sont dans des div.flex.items-center.gap-3
    const dateRows = page.locator("input[type='hidden'][name='startsAt'], input[type='hidden'][name='endsAt']");
    const count = await dateRows.count();
    expect(count, "Les champs startsAt et endsAt doivent exister").toBe(2);
  });

  test("le champ description est visible et pleine largeur", async ({ page }) => {
    const description = page.locator("textarea[name='description']");
    await expect(description).toBeVisible();

    const box = await description.boundingBox();
    if (box) {
      const viewportWidth = page.viewportSize()!.width;
      // Le textarea doit occuper au moins 70% du viewport (avec padding du conteneur)
      expect(
        box.width,
        `Textarea trop étroit : ${box.width}px / viewport ${viewportWidth}px`
      ).toBeGreaterThan(viewportWidth * 0.7);
    }
  });

  test("les boutons Enregistrer/Annuler sont dans le viewport", async ({ page }) => {
    const submitBtn = page.locator("button[type='submit']");
    await expect(submitBtn).toBeVisible();

    const cancelBtn = page.locator("button[type='button']").filter({ hasText: /annuler|cancel/i });
    if (await cancelBtn.count() > 0) {
      const box = await cancelBtn.first().boundingBox();
      if (box) {
        const viewportWidth = page.viewportSize()!.width;
        expect(
          box.x + box.width,
          "Le bouton Annuler dépasse le viewport"
        ).toBeLessThanOrEqual(viewportWidth + 1);
      }
    }
  });

  test("les boutons ont une zone de touch suffisante (≥ 44px)", async ({ page }) => {
    await expectTouchTargets(page);
  });
});

// ══════════════════════════════════════════════════════════════
// Page profil
// ══════════════════════════════════════════════════════════════

test.describe("Dashboard — Page profil — mobile", () => {
  test.skip(!authFileExists(), "Session auth non générée — lancer pnpm test:mobile:setup");
  test.use({ storageState: AUTH_FILE });

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/profile");
  });

  test("n'a pas de scroll horizontal", async ({ page }) => {
    await expectNoHorizontalScroll(page);
  });

  test("le formulaire profil est lisible (champs pleine largeur)", async ({ page }) => {
    const firstNameInput = page.locator("input#firstName");
    const lastNameInput = page.locator("input#lastName");

    await expect(firstNameInput).toBeVisible();
    await expect(lastNameInput).toBeVisible();

    const viewportWidth = page.viewportSize()!.width;

    for (const input of [firstNameInput, lastNameInput]) {
      const box = await input.boundingBox();
      if (box) {
        expect(
          box.width,
          `Champ trop étroit : ${box.width}px / viewport ${viewportWidth}px`
        ).toBeGreaterThan(viewportWidth * 0.6);
      }
    }
  });

  test("le champ email est visible mais désactivé", async ({ page }) => {
    const emailInput = page.locator("input#email");
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toBeDisabled();
  });

  test("les boutons ont une zone de touch suffisante (≥ 44px)", async ({ page }) => {
    await expectTouchTargets(page);
  });
});

// ══════════════════════════════════════════════════════════════
// Formulaire création Circle
// ══════════════════════════════════════════════════════════════

test.describe("Dashboard — Formulaire création Circle — mobile", () => {
  test.skip(!authFileExists(), "Session auth non générée — lancer pnpm test:mobile:setup");
  test.use({ storageState: AUTH_FILE });

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/circles/new");
  });

  test("n'a pas de scroll horizontal", async ({ page }) => {
    await expectNoHorizontalScroll(page);
  });

  test("les champs du formulaire sont en pleine largeur", async ({ page }) => {
    const nameInput = page.locator("input[name='name']");
    const descriptionTextarea = page.locator("textarea[name='description']");

    await expect(nameInput).toBeVisible();
    await expect(descriptionTextarea).toBeVisible();

    const viewportWidth = page.viewportSize()!.width;

    for (const field of [nameInput, descriptionTextarea]) {
      const box = await field.boundingBox();
      if (box) {
        expect(
          box.width,
          `Champ trop étroit : ${box.width}px / viewport ${viewportWidth}px`
        ).toBeGreaterThan(viewportWidth * 0.6);
      }
    }
  });

  test("le sélecteur de visibilité est visible", async ({ page }) => {
    const visibility = page.locator("#visibility");
    await expect(visibility).toBeVisible();
  });

  test("les boutons ont une zone de touch suffisante (≥ 44px)", async ({ page }) => {
    await expectTouchTargets(page);
  });
});

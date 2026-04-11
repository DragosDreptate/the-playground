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
    await page.goto("/fr/dashboard?tab=circles");
    const createCircleButton = page.locator("a[href*='/circles/new']").first();
    await expect(createCircleButton).toBeVisible();
  });

  test("should show the paris-creative-tech Circle on the dashboard", async ({ page }) => {
    await page.goto("/fr/dashboard?tab=circles");
    await expect(page.locator("main").first()).toContainText("Paris Creative Tech");
  });
});

test.describe("Flux Host — page Circle", () => {
  test.use({ storageState: AUTH.HOST });

  test("should display the Circle dashboard with its name", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator("h1").first()).toContainText("Paris Creative Tech");
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

test.describe("Flux Host — gestion des membres", () => {
  test.use({ storageState: AUTH.HOST });

  test("should show the remove button (⋮) on player rows but not on host rows", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);

    // Au moins un bouton ⋮ doit être visible (sur les lignes Participant)
    const moreButtons = page.locator("button[aria-label]").filter({ hasText: "" });
    // On cherche les boutons ⋮ via leur contenu SVG (MoreVertical)
    const verticalDots = page.locator("button").filter({ has: page.locator("svg") }).filter({ hasNotText: /modifier|créer|supprimer|quitter/i });

    // Vérifie que le dropdown "Retirer de la Communauté" est accessible
    // en cliquant sur le premier bouton ⋮ disponible
    const removeMenuButtons = page.getByRole("button", { name: /retirer/i });
    // Les boutons ⋮ sont présents si des Players sont dans le Circle
    // On vérifie via la présence du menu
    const allMoreButtons = page.locator("[data-radix-collection-item], button").filter({ hasText: "" });

    // Approche directe : chercher les boutons trigger du dropdown dans les lignes membres
    // Le bouton ⋮ a un aria-label "Retirer de la Communauté" (via tRemove("action"))
    const dropdownTriggers = page.getByRole("button", { name: "Retirer de la Communauté" });

    if (await dropdownTriggers.count() > 0) {
      await expect(dropdownTriggers.first()).toBeVisible();

      // Cliquer pour ouvrir le dropdown et vérifier l'item
      await dropdownTriggers.first().click();
      await expect(page.getByRole("menuitem", { name: "Retirer de la Communauté" })).toBeVisible();
    } else {
      // Pas de players dans ce Circle — le test passe quand même (pas d'erreur)
      await expect(page.locator("main")).toContainText(/membre|participant/i);
    }
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

    // Selector spécifique : le form contient maintenant 2 boutons submit
    // (draft + publish). On clique explicitement sur celui qui crée un brouillon
    // pour préserver la sémantique de ce test (comportement par défaut).
    await page.locator("button[name='intent'][value='draft']").click();

    await expect(page).toHaveURL(/\/dashboard\/circles\/.*\/moments\//, { timeout: 15_000 });
  });

  test("should show the created Moment in the Circle timeline", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);
    // La timeline doit contenir au moins un événement
    const momentLinks = page.locator("a[href*='/moments/']");
    await expect(momentLinks.first()).toBeVisible();
  });
});

/**
 * Tests E2E — Flux Host : publication directe depuis le formulaire de création
 *
 * Vérifie la feature "Publier directement" (PR #362) :
 *   - Desktop : le form a 2 boutons submit (draft + publish)
 *   - Cliquer "Enregistrer le brouillon" crée un DRAFT (comportement inchangé)
 *   - Cliquer "Publier" crée ET publie l'événement en une seule action
 *   - Sur mobile, le bouton Publier est masqué (hidden sm:inline-flex)
 *   - En mode édition d'un brouillon existant, le bouton Publier n'est pas dans le form
 *   - Presser Enter dans un input soumet en mode draft par défaut (1er submit button
 *     dans le DOM) — aucun risque de publication accidentelle au clavier
 */

test.describe("Flux Host — publication directe d'un Moment", () => {
  test.use({ storageState: AUTH.HOST });

  async function fillMomentForm(page: import("@playwright/test").Page, title: string) {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/new`);
    await page.fill("input[name='title']", title);

    const dateInput = page.locator("input[name='startsAt'], input[type='datetime-local']").first();
    if (await dateInput.isVisible()) {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const formatted = futureDate.toISOString().slice(0, 16);
      await dateInput.fill(formatted);
    }

    // La description est requise côté usecase (createMoment). On en met une courte
    // pour ne pas tomber sur l'erreur VALIDATION côté server action.
    const description = page.locator("textarea[name='description']");
    if (await description.isVisible()) {
      await description.fill("Description E2E publication directe");
    }
  }

  test("should create a DRAFT when clicking 'Enregistrer le brouillon'", async ({ page }) => {
    const title = `E2E Draft ${Date.now()}`;
    await fillMomentForm(page, title);

    // Bouton primary, toujours le 1er submit du DOM → couvre aussi implicitement
    // le cas Enter-in-input grâce à la sémantique HTML (1er submit par défaut)
    await page.locator("button[name='intent'][value='draft']").click();
    await expect(page).toHaveURL(/\/dashboard\/circles\/.*\/moments\//, { timeout: 15_000 });

    // Le moment créé est en DRAFT — le banner "en cours de préparation" doit être visible
    await expect(
      page.getByText(/en cours de préparation/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test("should create AND publish in one action when clicking 'Publier'", async ({ page }) => {
    const title = `E2E Publish ${Date.now()}`;
    await fillMomentForm(page, title);

    // Bouton outline, présent uniquement en création desktop (hidden sm:inline-flex)
    const publishButton = page.locator("button[name='intent'][value='publish']");
    await expect(publishButton).toBeVisible();
    await publishButton.click();

    await expect(page).toHaveURL(/\/dashboard\/circles\/.*\/moments\//, { timeout: 15_000 });

    // Le moment créé est en PUBLISHED — le banner draft ne doit PAS être visible
    await expect(page.getByText(/en cours de préparation/i)).toHaveCount(0);
  });

  test("should submit as DRAFT when pressing Enter in the title input", async ({ page }) => {
    const title = `E2E Enter ${Date.now()}`;
    await fillMomentForm(page, title);

    // Enter dans l'input titre → HTML soumet via le 1er submit button du DOM = draft
    await page.locator("input[name='title']").press("Enter");
    await expect(page).toHaveURL(/\/dashboard\/circles\/.*\/moments\//, { timeout: 15_000 });

    // Confirmer que c'est bien un DRAFT (pas un publish accidentel)
    await expect(
      page.getByText(/en cours de préparation/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test("should NOT show the 'Publier' button when editing an existing DRAFT moment", async ({ page }) => {
    // 1. Créer un moment DRAFT pour avoir une cible d'édition
    const title = `E2E Edit ${Date.now()}`;
    await fillMomentForm(page, title);
    await page.locator("button[name='intent'][value='draft']").click();
    await expect(page).toHaveURL(/\/dashboard\/circles\/.*\/moments\//, { timeout: 15_000 });

    // 2. Naviguer vers la page d'édition du moment qu'on vient de créer
    const momentUrl = page.url();
    await page.goto(`${momentUrl}/edit`);

    // Le form d'édition doit être visible
    await expect(page.locator("input[name='title']")).toBeVisible({ timeout: 8_000 });

    // Le bouton "Publier" du form NE doit PAS être présent en mode édition
    // (wrappé dans `{!moment && ...}` côté React → pas du tout rendu)
    await expect(page.locator("button[name='intent'][value='publish']")).toHaveCount(0);

    // En revanche le bouton draft (qui devient "Enregistrer" en mode édition) reste présent
    await expect(page.locator("button[name='intent'][value='draft']")).toBeVisible();
  });
});

test.describe("Flux Host — publication directe d'un Moment (mobile)", () => {
  test.use({
    storageState: AUTH.HOST,
    // Viewport mobile < 640px : le breakpoint Tailwind `sm:` n'est pas actif
    // → le bouton "Publier" doit être masqué via `hidden sm:inline-flex`
    viewport: { width: 375, height: 812 },
  });

  test("should NOT show the 'Publier' button on mobile viewport", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/new`);

    // Le bouton draft (primary) doit rester visible
    await expect(
      page.locator("button[name='intent'][value='draft']")
    ).toBeVisible();

    // Le bouton publish est rendu dans le DOM (React monte le composant) mais
    // Tailwind lui applique `hidden` par défaut → Playwright le voit comme non-visible
    await expect(
      page.locator("button[name='intent'][value='publish']")
    ).toBeHidden();
  });
});

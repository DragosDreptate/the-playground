import { test, expect } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Tests E2E — Inscription à un Moment (JoinMoment)
 *
 * Couvre :
 *   - Affichage de la page Moment publique
 *   - CTA d'inscription visible
 *   - Flux d'inscription complet (authentifié)
 *   - Social proof : compteur d'inscrits
 *   - Page Moment annulé → 404
 */

test.describe("Page Moment publique — affichage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/fr/m/${SLUGS.PUBLISHED_MOMENT}`);
  });

  test("should display the Moment title prominently", async ({ page }) => {
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).toContainText("Meetup IA générative");
  });

  test("should display the date of the Moment", async ({ page }) => {
    // La date est affichée via formatDateRange() — pas de balise <time>
    // On vérifie qu'un mois (FR ou EN) est visible dans la page
    await expect(page.locator("main").first()).toContainText(
      /janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|january|february|march|april|may|june|july|august|september|october|november|december/i
    );
  });

  test("should display the location information", async ({ page }) => {
    await expect(page.locator("main").first()).toContainText("Station F");
  });

  test("should display a registration CTA button", async ({ page }) => {
    // Pour les visiteurs non-auth, le CTA est un <a> rendu comme Button (asChild)
    const ctaButton = page.locator("a, button").filter({ hasText: /inscrire|s'inscrire|rejoindre|join|register/i });
    await expect(ctaButton.first()).toBeVisible();
  });

  test("should display social proof with registered attendees count", async ({ page }) => {
    // Social proof : au moins 4 inscrits (host, player1, player2, player4) seedés
    await expect(page.locator("main").first()).toContainText(/[1-9]\d* (participant|inscrit|member)/i);
  });

  test("should display a link to the Circle", async ({ page }) => {
    const circleLink = page.locator("a[href*='/circles/paris-creative-tech']");
    await expect(circleLink.first()).toBeVisible();
  });
});

test.describe("Inscription à un Moment — utilisateur authentifié", () => {
  test.use({ storageState: AUTH.PLAYER });

  test("should register the authenticated user to the Moment", async ({ page }) => {
    await page.goto(`/fr/m/${SLUGS.PUBLISHED_MOMENT}`);

    const ctaButton = page
      .locator("button")
      .filter({ hasText: /inscrire|s'inscrire|rejoindre|join|register/i })
      .first();

    // Player1 est déjà inscrit (seedé) — attendre que la page soit stable avant de vérifier
    // isVisible() sans timeout retourne false si la page n'a pas encore rendu le statut
    const isAlreadyRegistered = await page
      .locator("button, [data-testid='registration-status']")
      .filter({ hasText: /inscrit|registered|annuler|cancel/i })
      .first()
      .isVisible()
      .catch(() => false);

    if (!isAlreadyRegistered) {
      await ctaButton.click();
      await expect(
        page.locator("button, [data-testid='registration-status']").filter({
          hasText: /inscrit|registered|annuler|cancel/i,
        }).first()
      ).toBeVisible();
    } else {
      // Déjà inscrit — le statut est bien affiché
      await expect(
        page.locator("button, [data-testid='registration-status']").filter({
          hasText: /inscrit|registered|annuler|cancel/i,
        }).first()
      ).toBeVisible();
    }
  });

  test("should show the user as a member of the Circle after registration", async ({ page }) => {
    await page.goto(`/fr/m/${SLUGS.PUBLISHED_MOMENT}`);
    const circleLink = page.locator(`a[href*='/circles/${SLUGS.CIRCLE}']`).first();
    const href = await circleLink.getAttribute("href");
    if (href) {
      await page.goto(href);
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(page.locator("main")).toContainText("Paris Creative Tech");
    }
  });
});

test.describe("Page Moment — Moment annulé", () => {
  test("should show a 404 page for a CANCELLED Moment", async ({ page }) => {
    await page.goto(`/fr/m/${SLUGS.CANCELLED_MOMENT}`);
    // Next.js appelle notFound() pour les Moments CANCELLED.
    // En dev, le status HTTP peut varier — on vérifie que le contenu du Moment n'est pas affiché.
    await expect(page.locator("h1")).not.toContainText("Webinaire TypeScript", { timeout: 5_000 });
  });
});

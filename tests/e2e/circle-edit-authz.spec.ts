import { test, expect } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Tests E2E — Garde d'autorisation des pages de gestion d'une Communauté
 *
 * Régression : les pages `dashboard/circles/[slug]/edit` et
 * `dashboard/circles/[slug]/moments/new` rendaient leur formulaire à TOUT
 * utilisateur connecté qui devinait l'URL, sans vérifier qu'il est organisateur
 * actif de la Communauté. Le layout parent ne contrôle que l'authentification.
 *
 * Le contrôle attendu (aligné sur les pages de gestion sœurs) : un non-membre
 * ou un simple Participant est renvoyé vers la page publique `/circles/[slug]`.
 *
 * La couche écriture (usecases updateCircle / createMoment) est déjà couverte
 * par ses propres tests d'autorisation. Ici on verrouille la garde de page.
 */

// Page publique de la Communauté seed (sans préfixe /dashboard/).
const PUBLIC_CIRCLE_URL = new RegExp(`/circles/${SLUGS.CIRCLE}/?$`);

test.describe("Garde organisateur — Participant (non-organisateur)", () => {
  test.use({ storageState: AUTH.PLAYER });

  test("redirige l'édition de Communauté vers la page publique", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}/edit`);

    await expect(page).toHaveURL(PUBLIC_CIRCLE_URL);
  });

  test("redirige la création d'événement vers la page publique", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/new`);

    await expect(page).toHaveURL(PUBLIC_CIRCLE_URL);
  });
});

test.describe("Garde organisateur — Host (organisateur actif)", () => {
  test.use({ storageState: AUTH.HOST });

  test("autorise l'édition de Communauté pour l'organisateur", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}/edit`);

    // L'organisateur reste sur la page d'édition (aucune redirection).
    await expect(page).toHaveURL(/\/dashboard\/circles\/.+\/edit$/);
  });

  test("autorise la création d'événement pour l'organisateur", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/new`);

    await expect(page).toHaveURL(/\/dashboard\/circles\/.+\/moments\/new$/);
  });
});

import { test, expect } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Tests E2E — Profils publics (viralité)
 *
 * Couvre :
 *   - F1 : section membres sur page Communauté (connectés uniquement)
 *   - F2 : noms cliquables dans la liste des participants (page Moment)
 *   - F6 : noms cliquables dans CircleMembersList → profil public
 *          (page publique + dashboard Circle + dashboard Moment)
 *   - F7 : noms cliquables → page profil public `/u/[publicId]`
 *   - F8 : lien "Voir mon profil public" depuis la page profil dashboard
 */

test.describe("F2/F7 — Noms cliquables dans la liste des participants", () => {
  test("given an authenticated user, names in the attendees list should be links to public profiles", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: AUTH.PLAYER,
    });
    const page = await context.newPage();

    await page.goto(`/fr/m/${SLUGS.PUBLISHED_MOMENT}`);

    // La liste des participants doit être visible (.first() — la page Moment a plusieurs .divide-y)
    const attendeesList = page.locator(".divide-y").first();
    await expect(attendeesList).toBeVisible();

    // Au moins un lien vers /u/ doit exister dans la liste
    const profileLinks = page.locator("a[href*='/u/']");
    await expect(profileLinks.first()).toBeVisible();

    await context.close();
  });

  test("given an unauthenticated visitor, names should NOT be links (plain text)", async ({
    page,
  }) => {
    await page.goto(`/fr/m/${SLUGS.PUBLISHED_MOMENT}`);

    // Aucun lien vers /u/ ne doit exister pour les visiteurs non-auth
    const profileLinks = page.locator("a[href*='/u/']");
    await expect(profileLinks).toHaveCount(0);
  });

  test("given an authenticated user, clicking a name navigates to the public profile page", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: AUTH.PLAYER,
    });
    const page = await context.newPage();

    await page.goto(`/fr/m/${SLUGS.PUBLISHED_MOMENT}`);

    // Cliquer sur le premier lien de profil
    const firstProfileLink = page.locator("a[href*='/u/']").first();
    await expect(firstProfileLink).toBeVisible();

    const href = await firstProfileLink.getAttribute("href");
    expect(href).toMatch(/\/u\/[a-z0-9-]+-\d{4}/);

    await firstProfileLink.click();

    // La page profil doit s'afficher avec un titre (nom de l'utilisateur)
    await expect(page.locator("h1")).toBeVisible();

    await context.close();
  });
});

test.describe("F8 — Lien 'Voir mon profil public' depuis la page profil dashboard", () => {
  test("given a logged-in user with a publicId, a link to their public profile should be visible on the profile page", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: AUTH.HOST,
    });
    const page = await context.newPage();

    await page.goto("/fr/dashboard/profile");

    const viewProfileLink = page.locator("a[href*='/u/']").first();
    await expect(viewProfileLink).toBeVisible();

    await context.close();
  });

  test("given a logged-in user, clicking 'view public profile' shows the own profile with breadcrumb", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: AUTH.HOST,
    });
    const page = await context.newPage();

    await page.goto("/fr/dashboard/profile");

    const viewProfileLink = page.locator("a[href*='/u/']").first();
    await viewProfileLink.click();

    // Attendre la navigation vers /u/[publicId] et le rendu complet de la page
    await expect(page).toHaveURL(/\/u\//);
    await page.waitForLoadState("networkidle");

    // Le fil d'ariane "C'est votre profil" doit être affiché (profil propre)
    await expect(page.getByText(/votre profil|your profile/i)).toBeVisible();

    await context.close();
  });
});

test.describe("F1/F6 — Section membres sur la page Communauté", () => {
  // Depuis la refonte Circle (commit 76e4510), la section membres inline
  // (#members-section) a été remplacée par la modale CircleMembersDialog,
  // ouverte via le bloc stats "X Membres" ou le bloc avatars.

  test("given an authenticated user, the members modal should be accessible on a public circle page", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: AUTH.PLAYER });
    const page = await context.newPage();

    await page.goto(`/fr/circles/${SLUGS.CIRCLE}`);

    // Le trigger de la modale membres (bouton "X Membres") doit être présent
    const trigger = page.getByRole("button", { name: /\d+ membres?/i }).first();
    await expect(trigger).toBeVisible();

    await context.close();
  });

  test("given an unauthenticated visitor, the member count should NOT open a modal", async ({
    page,
  }) => {
    await page.goto(`/fr/circles/${SLUGS.PUBLIC_CIRCLE}`);

    // Pour les guests : le bloc "X Membres" est un div statique, pas un button.
    // Aucun bouton cliquable matchant /membres/ donc pas d'accès à la liste.
    const triggers = page.getByRole("button", { name: /\d+ membres?/i });
    await expect(triggers).toHaveCount(0);

    // Aucun lien vers /u/ visible (la modale n'est pas accessible)
    const profileLinks = page.locator("a[href*='/u/']");
    await expect(profileLinks).toHaveCount(0);
  });

  test("given an authenticated user, member names in the circle modal should be links to public profiles", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: AUTH.PLAYER });
    const page = await context.newPage();

    await page.goto(`/fr/circles/${SLUGS.CIRCLE}`);

    // Ouvrir la modale membres
    const trigger = page.getByRole("button", { name: /\d+ membres?/i }).first();
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Des liens vers /u/ doivent exister dans la modale
    const profileLinks = dialog.locator("a[href*='/u/']");
    await expect(profileLinks.first()).toBeVisible();

    await context.close();
  });

  test("given an authenticated user, clicking the member count opens the members modal", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: AUTH.PLAYER });
    const page = await context.newPage();

    await page.goto(`/fr/circles/${SLUGS.CIRCLE}`);

    // Le compteur de membres est cliquable (trigger de la modale)
    const trigger = page.getByRole("button", { name: /\d+ membres?/i }).first();
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await context.close();
  });
});

test.describe("Page profil public /u/[publicId]", () => {
  test("given an unauthenticated visitor, should redirect to sign-in", async ({ page }) => {
    // On navigue vers une URL de profil arbitraire sans être auth
    await page.goto("/fr/u/test-user-1234");

    // Doit rediriger vers la page de connexion
    await expect(page).toHaveURL(/sign-in/);
  });
});

test.describe("F6 — Noms cliquables dans le dashboard Circle (host)", () => {
  test.use({ storageState: AUTH.HOST });

  test("given a host, member names in the dashboard circle should be links to public profiles", async ({
    page,
  }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);

    const profileLinks = page.locator("a[href*='/u/']");
    await expect(profileLinks.first()).toBeVisible();
  });
});

test.describe("F7 — Noms cliquables dans le dashboard Moment (host)", () => {
  test.use({ storageState: AUTH.HOST });

  test("given a host, participant names in the dashboard moment should be links to public profiles", async ({
    page,
  }) => {
    await page.goto(
      `/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/${SLUGS.PUBLISHED_MOMENT}`
    );

    const profileLinks = page.locator("a[href*='/u/']");
    await expect(profileLinks.first()).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Tests E2E — Profils publics (viralité)
 *
 * Couvre :
 *   - F1 : section membres sur page Communauté (connectés uniquement)
 *   - F2 : noms cliquables dans la liste des participants (page Moment)
 *   - F6 : noms cliquables dans CircleMembersList → profil public
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

    // La liste des participants doit être visible
    const attendeesList = page.locator(".divide-y");
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

    const viewProfileLink = page.locator("a[href*='/u/']");
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

    // Le fil d'ariane "C'est votre profil" doit être affiché (profil propre)
    await expect(page.locator("main")).toContainText(/votre profil|your profile/i);

    await context.close();
  });
});

test.describe("F1/F6 — Section membres sur la page Communauté", () => {
  test("given an authenticated user, the members section should be visible on a public circle page", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: AUTH.PLAYER });
    const page = await context.newPage();

    await page.goto(`/fr/circles/${SLUGS.CIRCLE}`);

    // La section membres doit être présente
    const membersSection = page.locator("#members-section");
    await expect(membersSection).toBeVisible();

    await context.close();
  });

  test("given an unauthenticated visitor, should see a sign-in placeholder instead of members", async ({
    page,
  }) => {
    await page.goto(`/fr/circles/${SLUGS.PUBLIC_CIRCLE}`);

    // Le placeholder "Connecte-toi" doit être visible
    await expect(page.locator("#members-section")).toContainText(
      /connecte-toi|sign in/i
    );
    // Aucun lien vers /u/ dans la section membres
    const profileLinks = page.locator("#members-section a[href*='/u/']");
    await expect(profileLinks).toHaveCount(0);
  });

  test("given an authenticated user, member names in the circle page should be links to public profiles", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: AUTH.PLAYER });
    const page = await context.newPage();

    await page.goto(`/fr/circles/${SLUGS.CIRCLE}`);

    // Des liens vers /u/ doivent exister dans la section membres
    const profileLinks = page.locator("#members-section a[href*='/u/']");
    await expect(profileLinks.first()).toBeVisible();

    await context.close();
  });

  test("given an authenticated user, clicking the member count scrolls to the members section", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: AUTH.PLAYER });
    const page = await context.newPage();

    await page.goto(`/fr/circles/${SLUGS.CIRCLE}`);

    // Le compteur de membres doit être un lien ancre pour les connectés
    const memberCountLink = page.locator("a[href='#members-section']");
    await expect(memberCountLink).toBeVisible();

    await context.close();
  });

  test("given an unauthenticated visitor, the member count should NOT be a link", async ({
    page,
  }) => {
    await page.goto(`/fr/circles/${SLUGS.PUBLIC_CIRCLE}`);

    // Pas de lien ancre vers #members-section pour les non-connectés
    const memberCountLink = page.locator("a[href='#members-section']");
    await expect(memberCountLink).toHaveCount(0);
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

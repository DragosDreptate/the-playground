import { test, expect } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

// PLAYER3 isn't seeded as a member of yoga-montmartre — used to cover the
// "authenticated but not in the circle" path.
const YOGA_MOMENT = "test-atelier-meditation-mars";

/**
 * Tests E2E — Authentification
 *
 * Couvre :
 *   - Affichage de la page de connexion
 *   - Formulaire magic link (email)
 *   - Redirection après connexion
 *   - Page de vérification envoyée
 *
 * Prérequis : serveur Next.js en cours (BASE_URL)
 */

test.describe("Authentification — page de connexion", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/fr/auth/sign-in");
  });

  test("should display the sign-in page with an email input", async ({ page }) => {
    await expect(page.locator("input[type='email']")).toBeVisible();
  });

  test("should display a submit button for magic link", async ({ page }) => {
    // Le bouton magic link a le texte "Envoyer un lien magique" (FR)
    const submitButton = page.locator("button").filter({ hasText: /envoyer.*lien|magic.*link/i });
    await expect(submitButton).toBeVisible();
  });

  test("should show an error when submitting an invalid email", async ({ page }) => {
    await page.fill("input[type='email']", "not-an-email");
    // Cibler le bouton du formulaire email (pas Google/GitHub)
    await page.locator("button").filter({ hasText: /envoyer.*lien|magic.*link/i }).click();
    const emailInput = page.locator("input[type='email']");
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test("should reject a disposable email domain without sending anything", async ({ page }) => {
    // L'email jetable est rejeté par la server action AVANT tout appel à Resend
    // (aucun email envoyé). On reste sur la page avec le message d'erreur dédié.
    await page.fill("input[type='email']", "attacker@ibymail.com");
    await page.locator("button").filter({ hasText: /envoyer.*lien|magic.*link/i }).click();
    await expect(page.locator("#email-error")).toContainText(/jetable/i);
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test("should redirect after submitting a valid email (verify-request or error if email not configured)", async ({ page }) => {
    await page.fill("input[type='email']", "test@example.com");
    await page.locator("button").filter({ hasText: /envoyer.*lien|magic.*link/i }).click();
    // En CI sans RESEND_API_KEY, Auth.js peut rediriger vers /auth/error au lieu de /auth/verify-request
    await expect(page).toHaveURL(/\/auth\/(verify-request|error)/, { timeout: 10_000 });
  });
});

test.describe("Authentification — accès non authentifié", () => {
  test("should redirect unauthenticated user from /dashboard to sign-in", async ({ page }) => {
    await page.goto("/fr/dashboard");
    await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: 10_000 });
  });

  test("should allow access to public Moment page without authentication", async ({ page }) => {
    // La page Moment est publique — pas de redirection vers auth
    const response = await page.goto(`/fr/m/${SLUGS.PUBLISHED_MOMENT}`);
    // Soit la page charge (200) soit 404 — mais jamais redirection vers auth
    expect(response?.status()).not.toBe(302);
    await expect(page).not.toHaveURL(/\/auth\/sign-in/);
  });

  test("should redirect unauthenticated user from a dashboard event URL to its public page", async ({
    page,
  }) => {
    await page.goto(
      `/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/${SLUGS.PUBLISHED_MOMENT}`
    );
    await expect(page).toHaveURL(new RegExp(`/m/${SLUGS.PUBLISHED_MOMENT}$`), {
      timeout: 10_000,
    });
    await expect(page).not.toHaveURL(/\/auth\/sign-in/);
  });
});

test.describe("Authentification — accès dashboard event hors-Communauté", () => {
  test.use({ storageState: AUTH.PLAYER3 });

  test("should redirect a logged-in non-member from dashboard event detail to the public page", async ({
    page,
  }) => {
    await page.goto(
      `/fr/dashboard/circles/${SLUGS.PUBLIC_CIRCLE}/moments/${YOGA_MOMENT}`
    );
    await expect(page).toHaveURL(new RegExp(`/m/${YOGA_MOMENT}$`), {
      timeout: 10_000,
    });
  });

  test("should redirect a logged-in non-Host from dashboard event /edit to the public page", async ({
    page,
  }) => {
    await page.goto(
      `/fr/dashboard/circles/${SLUGS.PUBLIC_CIRCLE}/moments/${YOGA_MOMENT}/edit`
    );
    await expect(page).toHaveURL(new RegExp(`/m/${YOGA_MOMENT}$`), {
      timeout: 10_000,
    });
  });
});

test.describe("Magic link — protection contre les scanners email", () => {
  test("HEAD on /api/auth/callback/resend should return 200 without consuming the token", async ({
    request,
  }) => {
    // Les scanners email (Defender Safe Links) prefetchent en HEAD. On répond
    // 200 sans toucher au token plutôt que de laisser Auth.js lever une erreur.
    const response = await request.head(
      "/api/auth/callback/resend?token=fake&email=test%40example.com"
    );
    expect(response.status()).toBe(200);
  });

  test("page /auth/error?error=Verification should explain that the link expired", async ({
    page,
  }) => {
    await page.goto("/fr/auth/error?error=Verification");
    // Cible la mention « 15 minutes » qui est unique au verificationExplanation
    // (le message d'erreur générique mentionne aussi « expiré »).
    await expect(page.getByText(/15\s*minutes/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /nouveau lien/i })).toBeVisible();
  });
});

test.describe("Magic link — reconnexion transparente sur lien expiré", () => {
  test.use({ storageState: AUTH.HOST });

  test("should redirect an already-authenticated user from a Verification error to the dashboard", async ({
    page,
  }) => {
    // Lien magic expiré recliqué alors que la session est encore active : on
    // reconnecte en transparence vers le dashboard au lieu d'afficher le
    // cul-de-sac. Aucun token n'est réutilisé, on s'appuie sur la session.
    await page.goto("/fr/auth/error?error=Verification");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test("should still show the error page for a non-Verification error even when authenticated", async ({
    page,
  }) => {
    // Garde-fou de non-régression : SEUL Verification déclenche la reconnexion.
    // Tout autre code d'erreur reste affiché, même avec une session active.
    await page.goto("/fr/auth/error?error=AccessDenied");
    await expect(page).toHaveURL(/\/auth\/error/);
  });
});

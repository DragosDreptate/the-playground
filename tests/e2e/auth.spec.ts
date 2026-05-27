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

  test("page /auth/confirm should render a POST form when token + email are present", async ({
    page,
  }) => {
    await page.goto(
      "/fr/auth/confirm?token=fake-token&email=user%40example.com&callbackUrl=%2Fdashboard"
    );
    const form = page.locator("form[method='POST'][action*='/api/auth/callback/resend']");
    await expect(form).toBeVisible();
    await expect(form).toHaveAttribute("action", /token=fake-token/);
    await expect(form).toHaveAttribute("action", /email=user%40example.com/);
    await expect(form.locator("button[type='submit']")).toBeVisible();
  });

  test("page /auth/confirm should reject a request without token", async ({ page }) => {
    await page.goto("/fr/auth/confirm");
    await expect(page.locator("form")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /nouveau lien/i })).toBeVisible();
  });

  test("page /auth/error?error=Verification should explain the corporate inbox case", async ({
    page,
  }) => {
    await page.goto("/fr/auth/error?error=Verification");
    await expect(page.getByText(/anti-spam/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /nouveau lien/i })).toBeVisible();
  });
});

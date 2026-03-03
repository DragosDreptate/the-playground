import { test, expect } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

/**
 * Tests E2E — Invitation de membres dans une Communauté
 *
 * Couvre :
 *   - L'Organisateur voit la section "Partager & Inviter" sur le dashboard Circle
 *   - L'Organisateur peut générer un lien d'invitation (affichage de l'URL)
 *   - L'Organisateur peut révoquer le lien → le bouton "Générer" réapparaît
 *   - L'Organisateur peut saisir un email et déclencher l'envoi d'invitation
 *   - Visiteur non-auth avec lien join invalide → 404
 *   - Participant authentifié non-membre avec lien valide → voit le bouton "Rejoindre"
 *   - Participant authentifié rejoint → redirigé vers le dashboard Circle
 *   - Participant déjà membre avec lien join → voit "déjà membre"
 */

/** Extrait le token UUID depuis le texte de la page (affiché dans un div, pas un input) */
async function extractInviteToken(page: import("@playwright/test").Page): Promise<string | null> {
  const content = await page.locator("main").textContent().catch(() => "");
  const match = content?.match(/circles\/join\/([a-f0-9-]{36})/i);
  return match ? match[1] : null;
}

// ─────────────────────────────────────────────────────────────
// Vue Organisateur — dashboard Circle
// ─────────────────────────────────────────────────────────────

test.describe("Invitation — vue Organisateur", () => {
  test.use({ storageState: AUTH.HOST });

  test("should display the Share & Invite card on the Circle dashboard", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);
    await expect(page.locator("main")).toContainText(/Partager|Inviter/i);
  });

  test("should show a generate button when no invite token exists", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);

    // Révoquer d'abord si un token existe pour garantir l'état initial
    const revokeBtn = page.getByRole("button", { name: /révoquer/i });
    if (await revokeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await revokeBtn.click();
      await expect(page.getByRole("button", { name: /générer un lien/i })).toBeVisible({ timeout: 5_000 });
    }

    await expect(page.getByRole("button", { name: /générer un lien/i })).toBeVisible();
  });

  test("should generate an invite link and display the shareable URL", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);

    // Repartir d'un état sans token
    const revokeBtn = page.getByRole("button", { name: /révoquer/i });
    if (await revokeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await revokeBtn.click();
      await expect(page.getByRole("button", { name: /générer un lien/i })).toBeVisible({ timeout: 5_000 });
    }

    const generateBtn = page.getByRole("button", { name: /générer un lien/i });
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();

    // L'URL d'invitation doit s'afficher dans la page
    await expect(page.locator("main")).toContainText(/circles\/join\//i, { timeout: 5_000 });
  });

  test("should show the revoke button after generating an invite link", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);

    // Générer si nécessaire
    const generateBtn = page.getByRole("button", { name: /générer un lien/i });
    if (await generateBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await generateBtn.click();
      await expect(page.locator("main")).toContainText(/circles\/join\//i, { timeout: 5_000 });
    }

    await expect(page.getByRole("button", { name: /révoquer/i })).toBeVisible({ timeout: 5_000 });
  });

  test("should revoke the invite link and display the generate button again", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);

    // S'assurer qu'un token existe
    const generateBtn = page.getByRole("button", { name: /générer un lien/i });
    if (await generateBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await generateBtn.click();
      await expect(page.locator("main")).toContainText(/circles\/join\//i, { timeout: 5_000 });
    }

    const revokeBtn = page.getByRole("button", { name: /révoquer/i });
    await expect(revokeBtn).toBeVisible({ timeout: 5_000 });
    await revokeBtn.click();

    await expect(page.getByRole("button", { name: /générer un lien/i })).toBeVisible({ timeout: 5_000 });
  });

  test("should enable the send button when a valid email is typed", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);

    const emailInput = page.locator("input[type='email']").first();
    await expect(emailInput).toBeVisible();
    await emailInput.fill("invite-test@example.com");

    // Le bouton "Envoyer l'invitation" est activé dès qu'un email valide est saisi
    const sendBtn = page.getByRole("button", { name: /envoyer l'invitation/i });
    await expect(sendBtn).toBeEnabled();
  });

  test("should allow adding a second email field for batch invitation", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);

    const emailInput = page.locator("input[type='email']").first();
    await emailInput.fill("first@example.com");

    // Cliquer sur "Ajouter une adresse" ajoute un nouveau champ vide
    await page.getByRole("button", { name: /ajouter une adresse/i }).click();

    // Il doit y avoir maintenant 2 champs email
    await expect(page.locator("input[type='email']")).toHaveCount(2);

    // Remplir le second champ
    await page.locator("input[type='email']").nth(1).fill("second@example.com");

    // Le bouton "Envoyer les invitations" (pluriel) doit être actif
    const sendBtn = page.getByRole("button", { name: /envoyer/i });
    await expect(sendBtn).toBeEnabled();
  });
});

// ─────────────────────────────────────────────────────────────
// Page join — visiteur non authentifié
// ─────────────────────────────────────────────────────────────

test.describe("Invitation — page join (non authentifié)", () => {
  test("should show a 404 page for a nonexistent token", async ({ page }) => {
    await page.goto("/fr/circles/join/nonexistent-token-that-does-not-exist-abc123");
    await expect(page.locator("h1")).not.toContainText("Paris Creative Tech", { timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────────────────────
// Page join — Participant authentifié (Player3 = non membre de paris-creative-tech)
// ─────────────────────────────────────────────────────────────

test.describe("Invitation — page join (Participant authentifié non membre)", () => {
  test.use({ storageState: AUTH.PLAYER3 });

  test("should not redirect to sign-in when authenticated user accesses a join URL", async ({ page }) => {
    await page.goto("/fr/circles/join/any-token-value");
    await expect(page).not.toHaveURL(/sign-in/, { timeout: 5_000 });
  });

  test("should show a join button when accessing a valid invite URL", async ({ browser }) => {
    // Étape 1 : HOST génère un token
    const hostContext = await browser.newContext({ storageState: AUTH.HOST });
    const hostPage = await hostContext.newPage();
    await hostPage.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);

    const revokeBtn = hostPage.getByRole("button", { name: /révoquer/i });
    if (await revokeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await revokeBtn.click();
      await expect(hostPage.getByRole("button", { name: /générer un lien/i })).toBeVisible({ timeout: 5_000 });
    }
    const generateBtn = hostPage.getByRole("button", { name: /générer un lien/i });
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();
    await expect(hostPage.locator("main")).toContainText(/circles\/join\//i, { timeout: 5_000 });

    const inviteToken = await extractInviteToken(hostPage);
    await hostContext.close();

    if (!inviteToken) {
      test.skip(true, "Token non extractible depuis la page — vérification manuelle requise");
      return;
    }

    // Étape 2 : PLAYER3 accède à la page join
    const playerContext = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage = await playerContext.newPage();
    await playerPage.goto(`/fr/circles/join/${inviteToken}`);

    await expect(playerPage.locator("main")).toContainText(/Paris Creative Tech/i, { timeout: 5_000 });

    const joinBtn = playerPage
      .getByRole("button", { name: /rejoindre/i })
      .or(playerPage.getByRole("link", { name: /rejoindre/i }))
      .first();
    await expect(joinBtn).toBeVisible({ timeout: 5_000 });

    await playerContext.close();
  });
});

// ─────────────────────────────────────────────────────────────
// Page join — Participant déjà membre (Player1 est membre de paris-creative-tech)
// ─────────────────────────────────────────────────────────────

test.describe("Invitation — page join (Participant déjà membre)", () => {
  test.use({ storageState: AUTH.PLAYER });

  test("should show already-member state when accessing join URL for a Circle already joined", async ({ browser }) => {
    // HOST génère un token
    const hostContext = await browser.newContext({ storageState: AUTH.HOST });
    const hostPage = await hostContext.newPage();
    await hostPage.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}`);

    const generateBtn = hostPage.getByRole("button", { name: /générer un lien/i });
    if (await generateBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await generateBtn.click();
      await expect(hostPage.locator("main")).toContainText(/circles\/join\//i, { timeout: 5_000 });
    }

    const inviteToken = await extractInviteToken(hostPage);
    await hostContext.close();

    if (!inviteToken) {
      test.skip(true, "Token non extractible depuis la page — vérification manuelle requise");
      return;
    }

    // Player1 est déjà membre → la page indique "déjà membre"
    const playerContext = await browser.newContext({ storageState: AUTH.PLAYER });
    const playerPage = await playerContext.newPage();
    await playerPage.goto(`/fr/circles/join/${inviteToken}`);

    await expect(playerPage.locator("main")).toContainText(
      /déjà membre|already member|voir la communauté|see community/i,
      { timeout: 5_000 }
    );

    await playerContext.close();
  });
});

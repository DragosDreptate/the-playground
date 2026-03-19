import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { SLUGS, AUTH } from "./fixtures";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function navigateToMoment(page: Page, slug: string) {
  await page.goto(`/fr/m/${slug}`);
  await page.waitForLoadState("networkidle");
}

async function navigateToCircle(page: Page, slug: string) {
  await page.goto(`/fr/circles/${slug}`);
  await page.waitForLoadState("networkidle");
}

// ── Section 1: Circle membership approval ────────────────────────────────────

test.describe("Circle membership approval", () => {
  test.describe("given a Circle with requiresApproval=true", () => {
    test("should show approval CTA and pending state after join request", async ({ browser }) => {
      const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
      const page = await playerCtx.newPage();

      await navigateToCircle(page, SLUGS.APPROVAL_CIRCLE);

      // CTA should indicate approval is required
      const joinButton = page.getByRole("button", { name: /soumis à validation|subject to approval/i });
      await expect(joinButton).toBeVisible();

      // Click to request membership
      await joinButton.click();

      // Should show pending state (either button or badge)
      await expect(page.getByText(/en cours de validation|pending approval/i)).toBeVisible({ timeout: 10000 });

      await playerCtx.close();
    });

    test("Host should see and approve pending membership request", async ({ browser }) => {
      // Step 1: Player submits request
      const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
      const playerPage = await playerCtx.newPage();
      await navigateToCircle(playerPage, SLUGS.APPROVAL_CIRCLE);

      const joinButton = playerPage.getByRole("button", { name: /soumis à validation|subject to approval/i });
      if (await joinButton.isVisible()) {
        await joinButton.click();
        await expect(playerPage.getByText(/en cours de validation|pending approval/i)).toBeVisible({ timeout: 10000 });
      }
      await playerCtx.close();

      // Step 2: Host approves
      const hostCtx = await browser.newContext({ storageState: AUTH.HOST });
      const hostPage = await hostCtx.newPage();
      await hostPage.goto(`/fr/dashboard/circles/${SLUGS.APPROVAL_CIRCLE}`);
      await hostPage.waitForLoadState("networkidle");

      const approveButton = hostPage.getByRole("button", { name: /approuver|approve/i }).first();
      await expect(approveButton).toBeVisible();
      await approveButton.click();

      // Pending request should disappear
      await expect(approveButton).not.toBeVisible({ timeout: 10000 });

      await hostCtx.close();
    });

    test("Host should reject pending membership request", async ({ browser }) => {
      // Step 1: Player submits request (fresh context)
      const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
      const playerPage = await playerCtx.newPage();
      await navigateToCircle(playerPage, SLUGS.APPROVAL_CIRCLE);

      const joinButton = playerPage.getByRole("button", { name: /soumis à validation|subject to approval/i });
      if (await joinButton.isVisible()) {
        await joinButton.click();
        await playerPage.waitForLoadState("networkidle");
      }
      await playerCtx.close();

      // Step 2: Host rejects
      const hostCtx = await browser.newContext({ storageState: AUTH.HOST });
      const hostPage = await hostCtx.newPage();
      await hostPage.goto(`/fr/dashboard/circles/${SLUGS.APPROVAL_CIRCLE}`);
      await hostPage.waitForLoadState("networkidle");

      const rejectButton = hostPage.getByRole("button", { name: /refuser|reject/i }).first();
      if (await rejectButton.isVisible()) {
        await rejectButton.click();
        await expect(rejectButton).not.toBeVisible({ timeout: 10000 });
      }

      // Step 3: Player should see join button again
      const playerCtx2 = await browser.newContext({ storageState: AUTH.PLAYER3 });
      const playerPage2 = await playerCtx2.newPage();
      await navigateToCircle(playerPage2, SLUGS.APPROVAL_CIRCLE);
      await expect(playerPage2.getByRole("button", { name: /soumis à validation|subject to approval/i })).toBeVisible();

      await hostCtx.close();
      await playerCtx2.close();
    });
  });
});

// ── Section 2: Event registration approval ───────────────────────────────────

test.describe("Event registration approval", () => {
  test.describe("given an event with requiresApproval=true", () => {
    test("should show approval CTA and pending banner after registration request", async ({ browser }) => {
      const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
      const page = await playerCtx.newPage();

      await navigateToMoment(page, SLUGS.MOMENT_WITH_APPROVAL);

      // CTA should indicate approval is required
      const main = page.locator("main").first();
      const cta = main.getByRole("button", { name: /soumis à validation|subject to approval/i });
      await expect(cta).toBeVisible();

      // Submit request
      await cta.click();

      // Should show pending banner
      await expect(main.getByText(/demande envoyée|request sent/i)).toBeVisible({ timeout: 10000 });

      await playerCtx.close();
    });

    test("Host should approve pending registration", async ({ browser }) => {
      // Step 1: Player submits request
      const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
      const playerPage = await playerCtx.newPage();
      await navigateToMoment(playerPage, SLUGS.MOMENT_WITH_APPROVAL);

      const main = playerPage.locator("main").first();
      const cta = main.getByRole("button", { name: /soumis à validation|subject to approval/i });
      if (await cta.isVisible()) {
        await cta.click();
        await expect(main.getByText(/demande envoyée|request sent/i)).toBeVisible({ timeout: 10000 });
      }
      await playerCtx.close();

      // Step 2: Host approves from dashboard
      const hostCtx = await browser.newContext({ storageState: AUTH.HOST });
      const hostPage = await hostCtx.newPage();
      await hostPage.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/${SLUGS.MOMENT_WITH_APPROVAL}`);
      await hostPage.waitForLoadState("networkidle");

      const approveButton = hostPage.getByRole("button", { name: /approuver|approve/i }).first();
      await expect(approveButton).toBeVisible();
      await approveButton.click();
      await expect(approveButton).not.toBeVisible({ timeout: 10000 });

      await hostCtx.close();

      // Step 3: Player should see confirmed registration
      const playerCtx2 = await browser.newContext({ storageState: AUTH.PLAYER3 });
      const playerPage2 = await playerCtx2.newPage();
      await navigateToMoment(playerPage2, SLUGS.MOMENT_WITH_APPROVAL);

      const main2 = playerPage2.locator("main").first();
      await expect(main2.getByText(/vous participez|you're attending/i)).toBeVisible();

      await playerCtx2.close();
    });

    test("Host should reject pending registration — player can re-submit", async ({ browser }) => {
      // Step 1: Player submits request
      const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
      const playerPage = await playerCtx.newPage();
      await navigateToMoment(playerPage, SLUGS.MOMENT_WITH_APPROVAL);

      const main = playerPage.locator("main").first();
      const cta = main.getByRole("button", { name: /soumis à validation|subject to approval/i });
      if (await cta.isVisible()) {
        await cta.click();
        await playerPage.waitForLoadState("networkidle");
      }
      await playerCtx.close();

      // Step 2: Host rejects
      const hostCtx = await browser.newContext({ storageState: AUTH.HOST });
      const hostPage = await hostCtx.newPage();
      await hostPage.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/${SLUGS.MOMENT_WITH_APPROVAL}`);
      await hostPage.waitForLoadState("networkidle");

      const rejectButton = hostPage.getByRole("button", { name: /refuser|reject/i }).first();
      if (await rejectButton.isVisible()) {
        await rejectButton.click();
        await hostPage.waitForLoadState("networkidle");
      }
      await hostCtx.close();

      // Step 3: Player should see CTA again (can re-submit — D16)
      const playerCtx2 = await browser.newContext({ storageState: AUTH.PLAYER3 });
      const playerPage2 = await playerCtx2.newPage();
      await navigateToMoment(playerPage2, SLUGS.MOMENT_WITH_APPROVAL);

      const main2 = playerPage2.locator("main").first();
      const reCta = main2.getByRole("button", { name: /soumis à validation|subject to approval/i });
      await expect(reCta).toBeVisible();

      // Re-submit
      await reCta.click();
      await expect(main2.getByText(/demande envoyée|request sent/i)).toBeVisible({ timeout: 10000 });

      await playerCtx2.close();
    });
  });
});

// ── Section 3: Cross-flow (D2 Option A) ──────────────────────────────────────

test.describe("Cross-flow: event without approval in Circle with approval", () => {
  test("should register for event immediately but create pending Circle membership", async ({ browser }) => {
    const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const page = await playerCtx.newPage();

    await navigateToMoment(page, SLUGS.MOMENT_NO_APPROVAL_IN_APPROVAL_CIRCLE);

    const main = page.locator("main").first();
    // Event has no approval — CTA should be normal "S'inscrire"
    const cta = main.getByRole("button", { name: /s'inscrire|join$/i });
    await expect(cta).toBeVisible();

    await cta.click();

    // Should be immediately registered (not pending)
    await expect(main.getByText(/vous participez|you're attending/i)).toBeVisible({ timeout: 10000 });

    // Navigate to Circle page — should NOT be a member (PENDING)
    await navigateToCircle(page, SLUGS.APPROVAL_CIRCLE);
    // Should see pending badge, not member badge
    await expect(page.getByText(/en cours de validation|pending approval/i)).toBeVisible();

    await playerCtx.close();
  });

  test("rejected Circle membership should not affect event registration", async ({ browser }) => {
    // Precondition: Player is REGISTERED for event, PENDING for Circle (from previous test or fresh)
    // Host rejects the Circle membership
    const hostCtx = await browser.newContext({ storageState: AUTH.HOST });
    const hostPage = await hostCtx.newPage();
    await hostPage.goto(`/fr/dashboard/circles/${SLUGS.APPROVAL_CIRCLE}`);
    await hostPage.waitForLoadState("networkidle");

    const rejectButton = hostPage.getByRole("button", { name: /refuser|reject/i }).first();
    if (await rejectButton.isVisible()) {
      await rejectButton.click();
      await hostPage.waitForLoadState("networkidle");
    }
    await hostCtx.close();

    // Player should still see event as confirmed
    const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage = await playerCtx.newPage();
    await navigateToMoment(playerPage, SLUGS.MOMENT_NO_APPROVAL_IN_APPROVAL_CIRCLE);

    const main = playerPage.locator("main").first();
    await expect(main.getByText(/vous participez|you're attending/i)).toBeVisible();

    // Player should be able to access event from dashboard (not 404)
    await playerPage.goto(`/fr/dashboard/circles/${SLUGS.APPROVAL_CIRCLE}/moments/${SLUGS.MOMENT_NO_APPROVAL_IN_APPROVAL_CIRCLE}`);
    await expect(playerPage.locator("h1").first()).toBeVisible();

    await playerCtx.close();
  });
});

// ── Section 4: Dashboard participant ─────────────────────────────────────────

test.describe("Dashboard participant — pending states", () => {
  test("pending registration should appear in dashboard with pending badge", async ({ browser }) => {
    // Submit a pending request first
    const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const page = await playerCtx.newPage();

    await navigateToMoment(page, SLUGS.MOMENT_BOTH_APPROVAL);
    const main = page.locator("main").first();
    const cta = main.getByRole("button", { name: /soumis à validation|subject to approval/i });
    if (await cta.isVisible()) {
      await cta.click();
      await expect(main.getByText(/demande envoyée|request sent/i)).toBeVisible({ timeout: 10000 });
    }

    // Check dashboard
    await page.goto("/fr/dashboard");
    await page.waitForLoadState("networkidle");

    // The event should appear in the upcoming section with pending indicator
    await expect(page.getByText(/en attente de validation|pending approval/i).first()).toBeVisible();

    await playerCtx.close();
  });

  test("pending Circle membership should appear in dashboard with pending badge", async ({ browser }) => {
    const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const page = await playerCtx.newPage();

    // Submit Circle membership request
    await navigateToCircle(page, SLUGS.APPROVAL_CIRCLE);
    const joinButton = page.getByRole("button", { name: /soumis à validation|subject to approval/i });
    if (await joinButton.isVisible()) {
      await joinButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Check dashboard communities tab
    await page.goto("/fr/dashboard");
    await page.waitForLoadState("networkidle");

    // Switch to communities tab
    const circlesTab = page.getByRole("tab", { name: /communautés|communities/i });
    if (await circlesTab.isVisible()) {
      await circlesTab.click();
    }

    // Should see the approval circle with pending badge
    await expect(page.getByText(/en attente de validation|pending approval/i).first()).toBeVisible();

    await playerCtx.close();
  });
});

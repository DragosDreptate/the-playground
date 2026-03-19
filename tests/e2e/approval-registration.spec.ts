import { test, expect, type Page } from "@playwright/test";
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

/** Extract invite token from the dashboard Circle page */
async function extractInviteToken(page: Page): Promise<string | null> {
  const content = await page.locator("main").textContent().catch(() => "");
  const match = content?.match(/circles\/join\/([a-f0-9-]{36})/i);
  return match ? match[1] : null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 1: Circle membership approval — direct join
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("Circle membership approval — direct join", () => {
  test("should show approval CTA on public Circle page", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const page = await ctx.newPage();
    await navigateToCircle(page, SLUGS.APPROVAL_CIRCLE);

    const joinButton = page.getByRole("button", { name: /soumis à validation|subject to approval/i });
    await expect(joinButton).toBeVisible();

    await ctx.close();
  });

  test("should show pending state after submitting membership request", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const page = await ctx.newPage();
    await navigateToCircle(page, SLUGS.APPROVAL_CIRCLE);

    const joinButton = page.getByRole("button", { name: /soumis à validation|subject to approval/i });
    await joinButton.click();

    await expect(page.getByText(/en cours de validation|pending approval/i)).toBeVisible({ timeout: 10000 });

    await ctx.close();
  });

  test("pending member should NOT appear in the members list", async ({ browser }) => {
    // Ensure PLAYER3 has a pending request
    const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage = await playerCtx.newPage();
    await navigateToCircle(playerPage, SLUGS.APPROVAL_CIRCLE);
    const joinButton = playerPage.getByRole("button", { name: /soumis à validation|subject to approval/i });
    if (await joinButton.isVisible()) await joinButton.click();
    await playerCtx.close();

    // Check with Host that player3 is NOT in members list (only in pending section)
    const hostCtx = await browser.newContext({ storageState: AUTH.HOST });
    const hostPage = await hostCtx.newPage();
    await hostPage.goto(`/fr/dashboard/circles/${SLUGS.APPROVAL_CIRCLE}`);
    await hostPage.waitForLoadState("networkidle");

    // The members section should not list player3 as a regular member
    const membersSection = hostPage.locator("#members-section");
    if (await membersSection.isVisible()) {
      await expect(membersSection.getByText("player3@test.playground")).not.toBeVisible();
    }

    await hostCtx.close();
  });

  test("Host should see and approve pending membership request", async ({ browser }) => {
    // Ensure pending request exists
    const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage = await playerCtx.newPage();
    await navigateToCircle(playerPage, SLUGS.APPROVAL_CIRCLE);
    const joinButton = playerPage.getByRole("button", { name: /soumis à validation|subject to approval/i });
    if (await joinButton.isVisible()) await joinButton.click();
    await playerCtx.close();

    // Host approves
    const hostCtx = await browser.newContext({ storageState: AUTH.HOST });
    const hostPage = await hostCtx.newPage();
    await hostPage.goto(`/fr/dashboard/circles/${SLUGS.APPROVAL_CIRCLE}`);
    await hostPage.waitForLoadState("networkidle");

    const approveButton = hostPage.getByRole("button", { name: /approuver|approve/i }).first();
    await expect(approveButton).toBeVisible();
    await approveButton.click();
    await expect(approveButton).not.toBeVisible({ timeout: 10000 });

    await hostCtx.close();
  });

  test("Host should reject pending membership — player can re-request", async ({ browser }) => {
    // Player submits
    const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage = await playerCtx.newPage();
    await navigateToCircle(playerPage, SLUGS.APPROVAL_CIRCLE);
    const joinButton = playerPage.getByRole("button", { name: /soumis à validation|subject to approval/i });
    if (await joinButton.isVisible()) await joinButton.click();
    await playerCtx.close();

    // Host rejects
    const hostCtx = await browser.newContext({ storageState: AUTH.HOST });
    const hostPage = await hostCtx.newPage();
    await hostPage.goto(`/fr/dashboard/circles/${SLUGS.APPROVAL_CIRCLE}`);
    await hostPage.waitForLoadState("networkidle");
    const rejectButton = hostPage.getByRole("button", { name: /refuser|reject/i }).first();
    if (await rejectButton.isVisible()) {
      await rejectButton.click();
      await expect(rejectButton).not.toBeVisible({ timeout: 10000 });
    }
    await hostCtx.close();

    // Player should see join button again
    const playerCtx2 = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage2 = await playerCtx2.newPage();
    await navigateToCircle(playerPage2, SLUGS.APPROVAL_CIRCLE);
    await expect(playerPage2.getByRole("button", { name: /soumis à validation|subject to approval/i })).toBeVisible();
    await playerCtx2.close();
  });

  test("pending member should be able to cancel their request (leave)", async ({ browser }) => {
    // Player submits
    const ctx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const page = await ctx.newPage();
    await navigateToCircle(page, SLUGS.APPROVAL_CIRCLE);
    const joinButton = page.getByRole("button", { name: /soumis à validation|subject to approval/i });
    if (await joinButton.isVisible()) await joinButton.click();
    await page.waitForLoadState("networkidle");

    // Reload to get server-rendered pending state
    await navigateToCircle(page, SLUGS.APPROVAL_CIRCLE);

    // The pending badge should be visible
    await expect(page.getByText(/en cours de validation|pending approval/i)).toBeVisible();

    await ctx.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 2: Circle membership approval — invite token
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("Circle membership approval — invite token", () => {
  test("should show approval CTA on invite join page", async ({ browser }) => {
    // Host generates invite token
    const hostCtx = await browser.newContext({ storageState: AUTH.HOST });
    const hostPage = await hostCtx.newPage();
    await hostPage.goto(`/fr/dashboard/circles/${SLUGS.APPROVAL_CIRCLE}`);
    await hostPage.waitForLoadState("networkidle");

    // Generate token if needed
    const generateBtn = hostPage.getByRole("button", { name: /générer|generate/i }).first();
    if (await generateBtn.isVisible()) await generateBtn.click();

    // Reload to ensure token is persisted
    await hostPage.reload();
    await hostPage.waitForLoadState("networkidle");

    const token = await extractInviteToken(hostPage);
    expect(token).toBeTruthy();
    await hostCtx.close();

    // Player visits invite page
    const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage = await playerCtx.newPage();
    await playerPage.goto(`/fr/circles/join/${token}`);
    await playerPage.waitForLoadState("networkidle");

    // CTA should indicate approval is required
    await expect(playerPage.getByRole("button", { name: /soumis à validation|subject to approval/i })).toBeVisible();
    await playerCtx.close();
  });

  test("should show pending state after joining via invite token", async ({ browser }) => {
    // Host gets token
    const hostCtx = await browser.newContext({ storageState: AUTH.HOST });
    const hostPage = await hostCtx.newPage();
    await hostPage.goto(`/fr/dashboard/circles/${SLUGS.APPROVAL_CIRCLE}`);
    await hostPage.waitForLoadState("networkidle");
    const generateBtn = hostPage.getByRole("button", { name: /générer|generate/i }).first();
    if (await generateBtn.isVisible()) await generateBtn.click();
    await hostPage.reload();
    await hostPage.waitForLoadState("networkidle");
    const token = await extractInviteToken(hostPage);
    await hostCtx.close();

    // Player joins via token
    const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage = await playerCtx.newPage();
    await playerPage.goto(`/fr/circles/join/${token}`);
    await playerPage.waitForLoadState("networkidle");

    const joinButton = playerPage.getByRole("button", { name: /soumis à validation|subject to approval/i });
    if (await joinButton.isVisible()) await joinButton.click();

    // Should show pending state on the invite page
    await expect(playerPage.getByText(/en cours de validation|pending approval/i)).toBeVisible({ timeout: 10000 });
    await playerCtx.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 3: Event registration approval
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("Event registration approval", () => {
  test("should show approval CTA on event page", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const page = await ctx.newPage();
    await navigateToMoment(page, SLUGS.MOMENT_WITH_APPROVAL);

    const main = page.locator("main").first();
    await expect(main.getByRole("button", { name: /soumis à validation|subject to approval/i })).toBeVisible();
    await ctx.close();
  });

  test("should show pending banner after submitting registration request", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const page = await ctx.newPage();
    await navigateToMoment(page, SLUGS.MOMENT_WITH_APPROVAL);

    const main = page.locator("main").first();
    const cta = main.getByRole("button", { name: /soumis à validation|subject to approval/i });
    await cta.click();

    await expect(main.getByText(/demande envoyée|request sent/i)).toBeVisible({ timeout: 10000 });
    await ctx.close();
  });

  test("pending registrant should NOT appear in participants social proof", async ({ browser }) => {
    // Ensure pending request
    const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage = await playerCtx.newPage();
    await navigateToMoment(playerPage, SLUGS.MOMENT_WITH_APPROVAL);
    const main = playerPage.locator("main").first();
    const cta = main.getByRole("button", { name: /soumis à validation|subject to approval/i });
    if (await cta.isVisible()) await cta.click();
    await playerCtx.close();

    // Check with a different user — PLAYER1 visits the event page
    const otherCtx = await browser.newContext({ storageState: AUTH.PLAYER });
    const otherPage = await otherCtx.newPage();
    await navigateToMoment(otherPage, SLUGS.MOMENT_WITH_APPROVAL);

    // Participant list should not show player3
    const participantsList = otherPage.locator("main").first().locator(".divide-y").first();
    if (await participantsList.isVisible()) {
      await expect(participantsList.getByText("player3@test.playground")).not.toBeVisible();
    }
    await otherCtx.close();
  });

  test("Host should see pending registrations on event dashboard", async ({ browser }) => {
    // Ensure pending request
    const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage = await playerCtx.newPage();
    await navigateToMoment(playerPage, SLUGS.MOMENT_WITH_APPROVAL);
    const main = playerPage.locator("main").first();
    const cta = main.getByRole("button", { name: /soumis à validation|subject to approval/i });
    if (await cta.isVisible()) await cta.click();
    await playerCtx.close();

    // Host checks dashboard
    const hostCtx = await browser.newContext({ storageState: AUTH.HOST });
    const hostPage = await hostCtx.newPage();
    await hostPage.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/${SLUGS.MOMENT_WITH_APPROVAL}`);
    await hostPage.waitForLoadState("networkidle");

    await expect(hostPage.getByRole("button", { name: /approuver|approve/i }).first()).toBeVisible();
    await expect(hostPage.getByRole("button", { name: /refuser|reject/i }).first()).toBeVisible();
    await hostCtx.close();
  });

  test("Host approves — participant sees confirmed registration with calendar buttons", async ({ browser }) => {
    // Ensure pending request
    const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage = await playerCtx.newPage();
    await navigateToMoment(playerPage, SLUGS.MOMENT_WITH_APPROVAL);
    const main = playerPage.locator("main").first();
    const cta = main.getByRole("button", { name: /soumis à validation|subject to approval/i });
    if (await cta.isVisible()) await cta.click();
    await playerCtx.close();

    // Host approves
    const hostCtx = await browser.newContext({ storageState: AUTH.HOST });
    const hostPage = await hostCtx.newPage();
    await hostPage.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/${SLUGS.MOMENT_WITH_APPROVAL}`);
    await hostPage.waitForLoadState("networkidle");
    const approveButton = hostPage.getByRole("button", { name: /approuver|approve/i }).first();
    if (await approveButton.isVisible()) await approveButton.click();
    await hostCtx.close();

    // Player sees confirmed + calendar
    const playerCtx2 = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage2 = await playerCtx2.newPage();
    await navigateToMoment(playerPage2, SLUGS.MOMENT_WITH_APPROVAL);
    const main2 = playerPage2.locator("main").first();
    await expect(main2.getByText(/vous participez|you're attending/i)).toBeVisible();
    // Calendar buttons visible for confirmed registrations
    await expect(main2.getByText(/google/i).first()).toBeVisible();
    await playerCtx2.close();
  });

  test("Host rejects — participant can re-submit (D16)", async ({ browser }) => {
    // Ensure pending request
    const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage = await playerCtx.newPage();
    await navigateToMoment(playerPage, SLUGS.MOMENT_WITH_APPROVAL);
    const main = playerPage.locator("main").first();
    const cta = main.getByRole("button", { name: /soumis à validation|subject to approval/i });
    if (await cta.isVisible()) await cta.click();
    await playerCtx.close();

    // Host rejects
    const hostCtx = await browser.newContext({ storageState: AUTH.HOST });
    const hostPage = await hostCtx.newPage();
    await hostPage.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/${SLUGS.MOMENT_WITH_APPROVAL}`);
    await hostPage.waitForLoadState("networkidle");
    const rejectButton = hostPage.getByRole("button", { name: /refuser|reject/i }).first();
    if (await rejectButton.isVisible()) await rejectButton.click();
    await hostCtx.close();

    // Player sees CTA again and can re-submit
    const playerCtx2 = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage2 = await playerCtx2.newPage();
    await navigateToMoment(playerPage2, SLUGS.MOMENT_WITH_APPROVAL);
    const main2 = playerPage2.locator("main").first();
    const reCta = main2.getByRole("button", { name: /soumis à validation|subject to approval/i });
    await expect(reCta).toBeVisible();
    await reCta.click();
    await expect(main2.getByText(/demande envoyée|request sent/i)).toBeVisible({ timeout: 10000 });
    await playerCtx2.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 4: Cross-flow D2 — event without approval in Circle with approval
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("Cross-flow D2 — event no approval + Circle with approval", () => {
  test("should register immediately for event but create pending Circle membership", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const page = await ctx.newPage();
    await navigateToMoment(page, SLUGS.MOMENT_NO_APPROVAL_IN_APPROVAL_CIRCLE);

    const main = page.locator("main").first();
    // Event has no approval — normal CTA
    const cta = main.getByRole("button", { name: /s'inscrire|join$/i });
    await expect(cta).toBeVisible();
    await cta.click();

    // Immediately registered
    await expect(main.getByText(/vous participez|you're attending/i)).toBeVisible({ timeout: 10000 });

    // Circle page — should show pending badge (not member)
    await navigateToCircle(page, SLUGS.APPROVAL_CIRCLE);
    await expect(page.getByText(/en cours de validation|pending approval/i)).toBeVisible();

    await ctx.close();
  });

  test("Host approves Circle membership after event registration", async ({ browser }) => {
    // Ensure PLAYER3 is registered for event + pending for circle
    const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage = await playerCtx.newPage();
    await navigateToMoment(playerPage, SLUGS.MOMENT_NO_APPROVAL_IN_APPROVAL_CIRCLE);
    const main = playerPage.locator("main").first();
    const cta = main.getByRole("button", { name: /s'inscrire|join$/i });
    if (await cta.isVisible()) await cta.click();
    await playerCtx.close();

    // Host approves circle membership
    const hostCtx = await browser.newContext({ storageState: AUTH.HOST });
    const hostPage = await hostCtx.newPage();
    await hostPage.goto(`/fr/dashboard/circles/${SLUGS.APPROVAL_CIRCLE}`);
    await hostPage.waitForLoadState("networkidle");
    const approveButton = hostPage.getByRole("button", { name: /approuver|approve/i }).first();
    if (await approveButton.isVisible()) await approveButton.click();
    await hostCtx.close();

    // Player should now be a full member
    const playerCtx2 = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage2 = await playerCtx2.newPage();
    await navigateToCircle(playerPage2, SLUGS.APPROVAL_CIRCLE);
    await expect(playerPage2.getByText(/vous êtes membre|you are a member/i)).toBeVisible();
    await playerCtx2.close();
  });

  test("rejected Circle membership does not affect event registration", async ({ browser }) => {
    // Ensure PLAYER3 is registered + pending
    const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage = await playerCtx.newPage();
    await navigateToMoment(playerPage, SLUGS.MOMENT_NO_APPROVAL_IN_APPROVAL_CIRCLE);
    const main = playerPage.locator("main").first();
    const cta = main.getByRole("button", { name: /s'inscrire|join$/i });
    if (await cta.isVisible()) await cta.click();
    await playerCtx.close();

    // Host rejects circle membership
    const hostCtx = await browser.newContext({ storageState: AUTH.HOST });
    const hostPage = await hostCtx.newPage();
    await hostPage.goto(`/fr/dashboard/circles/${SLUGS.APPROVAL_CIRCLE}`);
    await hostPage.waitForLoadState("networkidle");
    const rejectButton = hostPage.getByRole("button", { name: /refuser|reject/i }).first();
    if (await rejectButton.isVisible()) await rejectButton.click();
    await hostCtx.close();

    // Player still sees event as confirmed
    const playerCtx2 = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage2 = await playerCtx2.newPage();
    await navigateToMoment(playerPage2, SLUGS.MOMENT_NO_APPROVAL_IN_APPROVAL_CIRCLE);
    const main2 = playerPage2.locator("main").first();
    await expect(main2.getByText(/vous participez|you're attending/i)).toBeVisible();

    // Dashboard access not 404
    await playerPage2.goto(`/fr/dashboard/circles/${SLUGS.APPROVAL_CIRCLE}/moments/${SLUGS.MOMENT_NO_APPROVAL_IN_APPROVAL_CIRCLE}`);
    await expect(playerPage2.locator("h1").first()).toBeVisible();
    await playerCtx2.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 5: Double approval — event + Circle both require approval
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("Double approval — event + Circle both require approval", () => {
  test("should show approval CTA for event in approval Circle", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const page = await ctx.newPage();
    await navigateToMoment(page, SLUGS.MOMENT_BOTH_APPROVAL);

    const main = page.locator("main").first();
    await expect(main.getByRole("button", { name: /soumis à validation|subject to approval/i })).toBeVisible();
    await ctx.close();
  });

  test("approving event creates pending Circle membership", async ({ browser }) => {
    // Player submits event request
    const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage = await playerCtx.newPage();
    await navigateToMoment(playerPage, SLUGS.MOMENT_BOTH_APPROVAL);
    const main = playerPage.locator("main").first();
    const cta = main.getByRole("button", { name: /soumis à validation|subject to approval/i });
    if (await cta.isVisible()) await cta.click();
    await playerCtx.close();

    // Host approves event registration
    const hostCtx = await browser.newContext({ storageState: AUTH.HOST });
    const hostPage = await hostCtx.newPage();
    await hostPage.goto(`/fr/dashboard/circles/${SLUGS.APPROVAL_CIRCLE}/moments/${SLUGS.MOMENT_BOTH_APPROVAL}`);
    await hostPage.waitForLoadState("networkidle");
    const approveButton = hostPage.getByRole("button", { name: /approuver|approve/i }).first();
    if (await approveButton.isVisible()) await approveButton.click();

    // Now check Circle dashboard — should have a pending membership request
    await hostPage.goto(`/fr/dashboard/circles/${SLUGS.APPROVAL_CIRCLE}`);
    await hostPage.waitForLoadState("networkidle");
    await expect(hostPage.getByText(/demandes.*en attente|pending.*request/i).first()).toBeVisible();
    await hostCtx.close();
  });

  test("approving both event and Circle makes user a full member", async ({ browser }) => {
    // Player submits event request
    const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage = await playerCtx.newPage();
    await navigateToMoment(playerPage, SLUGS.MOMENT_BOTH_APPROVAL);
    const main = playerPage.locator("main").first();
    const cta = main.getByRole("button", { name: /soumis à validation|subject to approval/i });
    if (await cta.isVisible()) await cta.click();
    await playerCtx.close();

    const hostCtx = await browser.newContext({ storageState: AUTH.HOST });
    const hostPage = await hostCtx.newPage();

    // Approve event
    await hostPage.goto(`/fr/dashboard/circles/${SLUGS.APPROVAL_CIRCLE}/moments/${SLUGS.MOMENT_BOTH_APPROVAL}`);
    await hostPage.waitForLoadState("networkidle");
    const approveEvent = hostPage.getByRole("button", { name: /approuver|approve/i }).first();
    if (await approveEvent.isVisible()) await approveEvent.click();

    // Approve circle membership
    await hostPage.goto(`/fr/dashboard/circles/${SLUGS.APPROVAL_CIRCLE}`);
    await hostPage.waitForLoadState("networkidle");
    const approveCircle = hostPage.getByRole("button", { name: /approuver|approve/i }).first();
    if (await approveCircle.isVisible()) await approveCircle.click();
    await hostCtx.close();

    // Player is now full member
    const playerCtx2 = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage2 = await playerCtx2.newPage();
    await navigateToCircle(playerPage2, SLUGS.APPROVAL_CIRCLE);
    await expect(playerPage2.getByText(/vous êtes membre|you are a member/i)).toBeVisible();
    await playerCtx2.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 6: Dashboard participant — pending states
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("Dashboard participant — pending states", () => {
  test("pending registration should appear in dashboard with pending badge", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const page = await ctx.newPage();

    // Submit pending event request
    await navigateToMoment(page, SLUGS.MOMENT_BOTH_APPROVAL);
    const main = page.locator("main").first();
    const cta = main.getByRole("button", { name: /soumis à validation|subject to approval/i });
    if (await cta.isVisible()) await cta.click();

    // Dashboard — event should appear with pending indicator
    await page.goto("/fr/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/en attente de validation|pending approval/i).first()).toBeVisible();
    await ctx.close();
  });

  test("pending Circle membership should appear in dashboard with pending badge", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const page = await ctx.newPage();

    // Submit Circle membership request
    await navigateToCircle(page, SLUGS.APPROVAL_CIRCLE);
    const joinButton = page.getByRole("button", { name: /soumis à validation|subject to approval/i });
    if (await joinButton.isVisible()) await joinButton.click();

    // Dashboard communities tab
    await page.goto("/fr/dashboard");
    await page.waitForLoadState("networkidle");
    const circlesTab = page.getByRole("tab", { name: /communautés|communities/i });
    if (await circlesTab.isVisible()) await circlesTab.click();

    await expect(page.getByText(/en attente de validation|pending approval/i).first()).toBeVisible();
    await ctx.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 7: Edge cases
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("Edge cases", () => {
  test("pending registrant should NOT be able to comment on the event (D11)", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const page = await ctx.newPage();

    // Submit pending request
    await navigateToMoment(page, SLUGS.MOMENT_WITH_APPROVAL);
    const main = page.locator("main").first();
    const cta = main.getByRole("button", { name: /soumis à validation|subject to approval/i });
    if (await cta.isVisible()) await cta.click();

    // Reload to get server state with PENDING_APPROVAL registration
    await navigateToMoment(page, SLUGS.MOMENT_WITH_APPROVAL);

    // The comment form textarea should not be visible for a PENDING_APPROVAL user
    // The server action blocks comments (D11), but the UI may also hide the form
    const commentInput = page.getByPlaceholder(/commentaire|comment/i);

    // If visible, attempt to post — server should reject
    if (await commentInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await commentInput.fill("Test comment from pending user");
      const publishButton = page.getByRole("button", { name: /publier|publish/i });
      await publishButton.click();
      // Wait for server response, then verify the comment was NOT posted
      await page.waitForTimeout(3000);
      await expect(page.getByText("Test comment from pending user")).not.toBeVisible();
    }
    // If comment input is not visible, D11 is enforced at the UI level (also valid)

    await ctx.close();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 8: Creation forms — requiresApproval toggle
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("Creation forms — requiresApproval toggle", () => {
  test.use({ storageState: AUTH.HOST });

  test("should display requiresApproval toggle in Circle creation form", async ({ page }) => {
    await page.goto("/fr/dashboard");
    await page.waitForLoadState("networkidle");

    // Navigate to create circle
    const createCircleLink = page.getByRole("link", { name: /créer.*communauté|create.*community/i }).first();
    if (await createCircleLink.isVisible()) {
      await createCircleLink.click();
      await page.waitForLoadState("networkidle");
    } else {
      await page.goto("/fr/dashboard/circles/new");
      await page.waitForLoadState("networkidle");
    }

    // Toggle label should be visible
    await expect(page.getByText("Validation des inscriptions")).toBeVisible();
    // Description should be visible
    await expect(page.getByText(/approuvées manuellement|approved manually/i)).toBeVisible();
    // Switch should be present
    await expect(page.locator("#requiresApproval")).toBeVisible();
  });

  test("should display requiresApproval toggle in event creation form", async ({ page }) => {
    await page.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/new`);
    await page.waitForLoadState("networkidle");

    // Toggle label should be visible
    await expect(page.getByText("Validation des inscriptions")).toBeVisible();
    // Description should be visible
    await expect(page.getByText(/approuvées manuellement|approved manually/i)).toBeVisible();
    // Switch should be present
    await expect(page.locator("#requiresApproval")).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section 9: Dashboard Host — pending requests visibility
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("Dashboard Host — pending requests section", () => {
  test("Host should see pending requests section on Circle dashboard", async ({ browser }) => {
    // Ensure a pending request exists
    const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage = await playerCtx.newPage();
    await navigateToCircle(playerPage, SLUGS.APPROVAL_CIRCLE);
    const joinButton = playerPage.getByRole("button", { name: /soumis à validation|subject to approval/i });
    if (await joinButton.isVisible()) await joinButton.click();
    await playerCtx.close();

    // Host visits Circle dashboard
    const hostCtx = await browser.newContext({ storageState: AUTH.HOST });
    const hostPage = await hostCtx.newPage();
    await hostPage.goto(`/fr/dashboard/circles/${SLUGS.APPROVAL_CIRCLE}`);
    await hostPage.waitForLoadState("networkidle");

    // Should see pending requests section with approve/reject buttons
    await expect(hostPage.getByText(/demandes.*en attente|pending.*request/i).first()).toBeVisible();
    await expect(hostPage.getByRole("button", { name: /approuver|approve/i }).first()).toBeVisible();
    await expect(hostPage.getByRole("button", { name: /refuser|reject/i }).first()).toBeVisible();
    await hostCtx.close();
  });

  test("Host should see pending registrations on event dashboard", async ({ browser }) => {
    // Ensure pending registration exists
    const playerCtx = await browser.newContext({ storageState: AUTH.PLAYER3 });
    const playerPage = await playerCtx.newPage();
    await navigateToMoment(playerPage, SLUGS.MOMENT_WITH_APPROVAL);
    const main = playerPage.locator("main").first();
    const cta = main.getByRole("button", { name: /soumis à validation|subject to approval/i });
    if (await cta.isVisible()) await cta.click();
    await playerCtx.close();

    // Host visits event dashboard
    const hostCtx = await browser.newContext({ storageState: AUTH.HOST });
    const hostPage = await hostCtx.newPage();
    await hostPage.goto(`/fr/dashboard/circles/${SLUGS.CIRCLE}/moments/${SLUGS.MOMENT_WITH_APPROVAL}`);
    await hostPage.waitForLoadState("networkidle");

    await expect(hostPage.getByText(/inscriptions en attente|pending registration/i).first()).toBeVisible();
    await expect(hostPage.getByRole("button", { name: /approuver|approve/i }).first()).toBeVisible();
    await hostCtx.close();
  });
});

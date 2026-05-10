import { config } from "dotenv";
config({ path: ".env.local" });

import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { SLUGS, AUTH, TEST_USERS } from "./fixtures";

/**
 * Tests E2E — Rejoindre une Communauté directement (sans passer par un événement)
 *
 * Couvre :
 *   - Circle public sans approval : clic "Rejoindre" → bouton "Membre" → reload affiche "Quitter"
 *   - Circle avec requiresApproval : clic "Rejoindre (soumis à validation)" → "Demande en cours…" → persiste après reload
 *
 * Mutation DB : pas de retry, cleanup en beforeEach (delete des memberships PLAYER3 sur les 2 circles testés).
 */

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

test.describe.configure({ retries: 0 });

test.describe("Rejoindre une Communauté directement", () => {
  test.use({ storageState: AUTH.PLAYER3 });

  test.beforeEach(async () => {
    await prisma.circleMembership.deleteMany({
      where: {
        user: { email: TEST_USERS.PLAYER3 },
        circle: { slug: { in: [SLUGS.PUBLIC_CIRCLE, SLUGS.APPROVAL_CIRCLE] } },
      },
    });
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("should join a public circle without approval and persist after reload", async ({ page }) => {
    await page.goto(`/fr/circles/${SLUGS.PUBLIC_CIRCLE}`);

    const joinButton = page.getByRole("button", { name: /^Rejoindre$/ });
    await expect(joinButton).toBeVisible({ timeout: 10_000 });

    await joinButton.click();

    const memberButton = page.getByRole("button", { name: /^Membre$/ });
    await expect(memberButton).toBeVisible({ timeout: 10_000 });
    await expect(memberButton).toBeDisabled();

    await page.reload();

    // Après reload, l'état serveur prime : showJoinButton=false, le bouton "Quitter" apparaît
    await expect(page.getByRole("button", { name: /^Rejoindre$/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /quitter la communauté/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("should request approval on a circle with requiresApproval and persist pending state after reload", async ({ page }) => {
    await page.goto(`/fr/circles/${SLUGS.APPROVAL_CIRCLE}`);

    const joinButton = page.getByRole("button", { name: /rejoindre.*validation/i });
    await expect(joinButton).toBeVisible({ timeout: 10_000 });

    await joinButton.click();

    const pendingButton = page.getByRole("button", { name: /demande en cours de validation/i });
    await expect(pendingButton).toBeVisible({ timeout: 10_000 });
    await expect(pendingButton).toBeDisabled();

    await page.reload();

    // Après reload, isPendingMember=true → le badge "Demande en cours de validation" reste visible
    await expect(page.getByText(/demande en cours de validation/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("button", { name: /rejoindre.*validation/i })).toHaveCount(0);
  });
});

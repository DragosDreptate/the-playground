import { config } from "dotenv";
config({ path: ".env.local" });

import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { SLUGS, AUTH, TEST_USERS } from "./fixtures";

/**
 * Parcours réel : paiement sur le compte de l'Organisateur, webhook, inscription,
 * désinscription et remboursement. Voir playwright.config.stripe-live.ts pour le
 * lancer. Sans STRIPE_E2E_ACCOUNT, la suite est ignorée (CI comprise).
 */
const account = process.env.STRIPE_E2E_ACCOUNT;

test.describe.configure({ mode: "serial" });

test.describe("Paiement réel sur le compte de l'Organisateur", () => {
  test.skip(!account, "STRIPE_E2E_ACCOUNT absent");
  test.use({ storageState: AUTH.PLAYER3 });

  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
  });

  async function findRegistration() {
    return prisma.registration.findFirst({
      where: {
        moment: { slug: SLUGS.PAID_MOMENT_REFUNDABLE },
        user: { email: TEST_USERS.PLAYER3 },
      },
    });
  }

  test.beforeAll(async () => {
    await prisma.circle.update({
      where: { slug: SLUGS.PAID_CIRCLE },
      data: { stripeConnectAccountId: account },
    });
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("should register the Participant after paying on Stripe, then refund on cancellation", async ({ page }) => {
    await page.goto(`/fr/m/${SLUGS.PAID_MOMENT_REFUNDABLE}`);
    await page.locator("main").first().locator("button", { hasText: /S'inscrire.*EUR/i }).click();

    // Page de paiement : carte seule, euros, sans code promo ni autre devise (D4, D6, D7)
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
    await expect(page.locator("#cardNumber")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("15,00 €").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /RON|USD|Klarna|Bancontact/ })).toHaveCount(0);
    await expect(page.locator("#promotionCode")).toHaveCount(0);

    await page.locator("#cardNumber").fill("4242424242424242");
    await page.locator("#cardExpiry").fill("12 / 34");
    await page.locator("#cardCvc").fill("123");
    await page.locator("#billingName").fill("Test Lot Quatre");
    await page.locator("#billingCountry").selectOption("FR").catch(() => {});
    await page.locator("#enableStripePass").uncheck({ force: true, timeout: 1_500 }).catch(() => {});
    await page.locator("#termsOfServiceConsentCheckbox").check({ force: true });
    await page.locator("button[type=submit]").click();

    // Retour sur la page de l'événement, une fois le webhook traité
    await page.waitForURL(new RegExp(`/m/${SLUGS.PAID_MOMENT_REFUNDABLE}`), { timeout: 60_000 });
    await expect
      .poll(async () => (await findRegistration())?.paymentStatus, { timeout: 30_000 })
      .toBe("PAID");

    const paid = await findRegistration();
    expect(paid?.status).toBe("REGISTERED");
    expect(paid?.stripeAccountId).toBe(account);
    expect(paid?.stripePaymentIntentId).toMatch(/^pi_/);
    expect(paid?.stripeReceiptUrl).toMatch(/^https:\/\/pay\.stripe\.com/);

    // Désinscription : remboursement sur le compte de l'Organisateur
    await page.reload();
    await page.getByRole("button", { name: /Annuler mon inscription|Se désinscrire/ }).first().click();
    const dialog = page.locator('[role="alertdialog"]');
    await expect(dialog).toContainText("en général sous 5 à 10 jours");
    await dialog.getByRole("button").last().click();

    await expect
      .poll(async () => (await findRegistration())?.paymentStatus, { timeout: 30_000 })
      .toBe("REFUNDED");
    expect((await findRegistration())?.status).toBe("CANCELLED");
  });
});

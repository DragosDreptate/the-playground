import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Stripe from "stripe";
import { createStripePaymentService, toConnectAccountStatus } from "../stripe-payment-service";
import { InvalidWebhookSignatureError } from "@/domain/errors";

const WEBHOOK_SECRET = "whsec_test_secret";
const signer = new Stripe("sk_test_fake");

function signed(event: object) {
  const payload = JSON.stringify(event);
  const signature = signer.webhooks.generateTestHeaderString({
    payload,
    secret: WEBHOOK_SECRET,
  });
  return { payload, signature };
}

function checkoutEvent(overrides: { account?: string; paymentStatus?: string }) {
  return {
    id: "evt_test",
    object: "event",
    type: "checkout.session.completed",
    account: overrides.account,
    data: {
      object: {
        id: "cs_test",
        object: "checkout.session",
        payment_status: overrides.paymentStatus ?? "paid",
        payment_intent: null,
        metadata: { userId: "user-1", momentId: "moment-1", circleId: "circle-1" },
      },
    },
  };
}

describe("StripePaymentService.handleWebhookEvent", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("given a paid checkout on an Organizer account", () => {
    it("should return the event with the Organizer account", async () => {
      const { payload, signature } = signed(checkoutEvent({ account: "acct_organizer" }));

      const event = await createStripePaymentService().handleWebhookEvent(payload, signature);

      expect(event).toEqual({
        type: "checkout_completed",
        userId: "user-1",
        momentId: "moment-1",
        circleId: "circle-1",
        paymentIntentId: "",
        receiptUrl: "",
        accountId: "acct_organizer",
      });
    });
  });

  describe("given a checkout not paid yet", () => {
    it("should ignore it so that no registration is confirmed", async () => {
      const { payload, signature } = signed(
        checkoutEvent({ account: "acct_organizer", paymentStatus: "unpaid" })
      );

      const event = await createStripePaymentService().handleWebhookEvent(payload, signature);

      expect(event).toEqual({ type: "unknown" });
    });
  });

  describe("given an event without an Organizer account", () => {
    it("should ignore it", async () => {
      const { payload, signature } = signed(checkoutEvent({}));

      const event = await createStripePaymentService().handleWebhookEvent(payload, signature);

      expect(event).toEqual({ type: "unknown" });
    });
  });

  describe("given a refund on an Organizer account", () => {
    it("should return the refunded payment with its account", async () => {
      const { payload, signature } = signed({
        id: "evt_test",
        object: "event",
        type: "charge.refunded",
        account: "acct_organizer",
        data: { object: { id: "ch_test", object: "charge", payment_intent: "pi_test", refunded: true } },
      });

      const event = await createStripePaymentService().handleWebhookEvent(payload, signature);

      expect(event).toEqual({
        type: "charge_refunded",
        paymentIntentId: "pi_test",
        accountId: "acct_organizer",
      });
    });
  });

  describe("given a partial refund on an Organizer account", () => {
    it("should ignore it", async () => {
      const { payload, signature } = signed({
        id: "evt_test",
        object: "event",
        type: "charge.refunded",
        account: "acct_organizer",
        data: { object: { id: "ch_test", object: "charge", payment_intent: "pi_test", refunded: false } },
      });

      const event = await createStripePaymentService().handleWebhookEvent(payload, signature);

      expect(event).toEqual({ type: "unknown" });
    });
  });

  describe("given an invalid signature", () => {
    it("should reject the event", async () => {
      const { payload } = signed(checkoutEvent({ account: "acct_organizer" }));

      await expect(
        createStripePaymentService().handleWebhookEvent(payload, "t=1,v1=invalid")
      ).rejects.toThrow(InvalidWebhookSignatureError);
    });
  });
});

describe("toConnectAccountStatus", () => {
  it.each([
    ["active", { details_submitted: true, charges_enabled: true }],
    ["verifying", { details_submitted: true, charges_enabled: false, requirements: { disabled_reason: "requirements.pending_verification" } }],
    ["disabled", { details_submitted: true, charges_enabled: false, requirements: { disabled_reason: "requirements.past_due" } }],
    ["restricted", { details_submitted: false, charges_enabled: false, requirements: { disabled_reason: null, currently_due: ["external_account"] } }],
    ["pending", { details_submitted: false, charges_enabled: false, requirements: { disabled_reason: null, currently_due: [] } }],
  ])("should return %s", (status, account) => {
    expect(toConnectAccountStatus(account as unknown as Stripe.Account)).toBe(status);
  });
});

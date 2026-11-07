import { describe, it, expect, vi, beforeEach } from "vitest";
import { InvalidWebhookSignatureError } from "@/domain/errors";

const { handlePaymentWebhook, captureException, captureMessage, notifyRefundFailure } = vi.hoisted(() => ({
  handlePaymentWebhook: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  notifyRefundFailure: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@sentry/nextjs", () => ({ captureException, captureMessage }));
vi.mock("@/app/actions/helpers/notify-refund-failure", () => ({ notifyRefundFailure }));
vi.mock("@/app/actions/helpers/email-locale-resolver", () => ({ buildEmailLocaleResolver: vi.fn() }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: vi.fn((task: () => unknown) => task()),
}));
vi.mock("@/domain/usecases/handle-payment-webhook", () => ({ handlePaymentWebhook }));
vi.mock("@/infrastructure/repositories", () => ({
  prismaCircleRepository: {},
  prismaMomentRepository: {},
  prismaRegistrationRepository: {},
}));
vi.mock("@/infrastructure/services", () => ({ createStripePaymentService: () => ({}) }));
vi.mock("@/app/actions/registration", () => ({ sendRegistrationEmails: vi.fn() }));

import { POST } from "../route";

function webhookRequest(signature: string | null = "sig") {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: signature ? { "stripe-signature": signature } : {},
    body: "{}",
  });
}

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("given a processing failure", () => {
    it("should answer 500 so that Stripe replays the event, and report it", async () => {
      const failure = new Error("DB unavailable");
      handlePaymentWebhook.mockRejectedValue(failure);

      const response = await POST(webhookRequest());

      expect(response.status).toBe(500);
      expect(captureException).toHaveBeenCalledWith(failure);
    });
  });

  describe("given an invalid signature", () => {
    it("should answer 400 without reporting it", async () => {
      handlePaymentWebhook.mockRejectedValue(new InvalidWebhookSignatureError());

      const response = await POST(webhookRequest());

      expect(response.status).toBe(400);
      expect(captureException).not.toHaveBeenCalled();
    });
  });

  describe("given a missing signature", () => {
    it("should answer 400", async () => {
      const response = await POST(webhookRequest(null));

      expect(response.status).toBe(400);
      expect(handlePaymentWebhook).not.toHaveBeenCalled();
    });
  });

  describe("given a refund refused by Stripe", () => {
    it("should answer 200 and warn the Community owner once", async () => {
      handlePaymentWebhook.mockResolvedValue({
        handled: false,
        reason: "Event is full — refund refused",
        refundFailure: { momentId: "moment-1", userId: "user-1" },
      });

      const response = await POST(webhookRequest());

      expect(response.status).toBe(200);
      expect(captureMessage).toHaveBeenCalledTimes(1);
      expect(notifyRefundFailure).toHaveBeenCalledWith("moment-1", ["user-1"], undefined);
    });
  });

  describe("given an event that needs no action", () => {
    it("should answer 200", async () => {
      handlePaymentWebhook.mockResolvedValue({ handled: false, reason: "Ignored event type: unknown" });

      const response = await POST(webhookRequest());

      expect(response.status).toBe(200);
    });
  });
});

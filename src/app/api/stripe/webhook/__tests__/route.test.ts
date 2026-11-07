import { describe, it, expect, vi, beforeEach } from "vitest";
import { InvalidWebhookSignatureError } from "@/domain/errors";

const { handlePaymentWebhook, captureException } = vi.hoisted(() => ({
  handlePaymentWebhook: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: vi.fn(),
}));
vi.mock("@/domain/usecases/handle-payment-webhook", () => ({ handlePaymentWebhook }));
vi.mock("@/infrastructure/repositories", () => ({
  prismaCircleRepository: {},
  prismaMomentRepository: {},
  prismaRegistrationRepository: {},
}));
vi.mock("@/infrastructure/services", () => ({ createStripePaymentService: () => ({}) }));
vi.mock("@/app/actions/registration", () => ({ sendRegistrationEmails: vi.fn() }));
vi.mock("@/lib/email/email-locale", () => ({ buildEmailLocaleResolver: vi.fn() }));

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

  describe("given an event that needs no action", () => {
    it("should answer 200", async () => {
      handlePaymentWebhook.mockResolvedValue({ handled: false, reason: "Ignored event type: unknown" });

      const response = await POST(webhookRequest());

      expect(response.status).toBe(200);
    });
  });
});

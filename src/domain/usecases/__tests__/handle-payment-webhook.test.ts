import { describe, it, expect, vi } from "vitest";
import { handlePaymentWebhook } from "../handle-payment-webhook";
import { createMockMomentRepository, makeMoment } from "./helpers/mock-moment-repository";
import { createMockCircleRepository, makeMembership } from "./helpers/mock-circle-repository";
import { createMockRegistrationRepository, makeRegistration } from "./helpers/mock-registration-repository";
import { createMockPaymentService } from "./helpers/mock-payment-service";

const checkoutEvent = {
  type: "checkout_completed" as const,
  userId: "user-2",
  momentId: "moment-1",
  circleId: "circle-1",
  paymentIntentId: "pi_test_123",
  receiptUrl: "https://pay.stripe.com/receipts/test",
};

function makeDeps(overrides: {
  paymentService?: Partial<ReturnType<typeof createMockPaymentService>>;
  momentRepository?: Partial<ReturnType<typeof createMockMomentRepository>>;
  circleRepository?: Partial<ReturnType<typeof createMockCircleRepository>>;
  registrationRepository?: Partial<ReturnType<typeof createMockRegistrationRepository>>;
} = {}) {
  return {
    paymentService: createMockPaymentService(overrides.paymentService),
    momentRepository: createMockMomentRepository(overrides.momentRepository),
    circleRepository: createMockCircleRepository(overrides.circleRepository),
    registrationRepository: createMockRegistrationRepository(overrides.registrationRepository),
  };
}

describe("handlePaymentWebhook", () => {
  describe("given a valid checkout_completed event", () => {
    it("should create a PAID registration and join Circle", async () => {
      const moment = makeMoment({ id: "moment-1", price: 1500, capacity: 30 });
      const registration = makeRegistration({
        momentId: "moment-1",
        userId: "user-2",
        status: "REGISTERED",
        paymentStatus: "PAID",
        stripePaymentIntentId: "pi_test_123",
      });
      const deps = makeDeps({
        paymentService: {
          handleWebhookEvent: vi.fn().mockResolvedValue(checkoutEvent),
        },
        momentRepository: {
          findById: vi.fn().mockResolvedValue(moment),
        },
        registrationRepository: {
          findByStripePaymentIntentId: vi.fn().mockResolvedValue(null),
          countByMomentIdAndStatus: vi.fn().mockResolvedValue(5),
          create: vi.fn().mockResolvedValue(registration),
        },
        circleRepository: {
          findMembership: vi.fn().mockResolvedValue(null),
          addMembership: vi.fn().mockResolvedValue(makeMembership()),
        },
      });

      const result = await handlePaymentWebhook(
        { payload: "raw-body", signature: "sig" },
        deps
      );

      expect(result.handled).toBe(true);
      if (result.handled) {
        expect(result.registration.paymentStatus).toBe("PAID");
      }
      expect(deps.registrationRepository.create).toHaveBeenCalledWith({
        momentId: "moment-1",
        userId: "user-2",
        status: "REGISTERED",
        paymentStatus: "PAID",
        stripePaymentIntentId: "pi_test_123",
        stripeReceiptUrl: "https://pay.stripe.com/receipts/test",
      });
      expect(deps.circleRepository.addMembership).toHaveBeenCalledWith("circle-1", "user-2", "PLAYER");
    });
  });

  describe("given a duplicate paymentIntentId (idempotence)", () => {
    it("should return handled=false without creating a registration", async () => {
      const deps = makeDeps({
        paymentService: {
          handleWebhookEvent: vi.fn().mockResolvedValue(checkoutEvent),
        },
        registrationRepository: {
          findByStripePaymentIntentId: vi.fn().mockResolvedValue(
            makeRegistration({ stripePaymentIntentId: "pi_test_123" })
          ),
        },
      });

      const result = await handlePaymentWebhook(
        { payload: "raw-body", signature: "sig" },
        deps
      );

      expect(result.handled).toBe(false);
      expect(deps.registrationRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("given the event is full (race condition)", () => {
    it("should refund the payment and return handled=false", async () => {
      const moment = makeMoment({ id: "moment-1", price: 1500, capacity: 10 });
      const deps = makeDeps({
        paymentService: {
          handleWebhookEvent: vi.fn().mockResolvedValue(checkoutEvent),
          refund: vi.fn().mockResolvedValue(undefined),
        },
        momentRepository: {
          findById: vi.fn().mockResolvedValue(moment),
        },
        registrationRepository: {
          findByStripePaymentIntentId: vi.fn().mockResolvedValue(null),
          countByMomentIdAndStatus: vi.fn()
            .mockResolvedValueOnce(8)   // REGISTERED
            .mockResolvedValueOnce(2),  // CHECKED_IN → total 10 = capacity
        },
      });

      const result = await handlePaymentWebhook(
        { payload: "raw-body", signature: "sig" },
        deps
      );

      expect(result.handled).toBe(false);
      expect(deps.paymentService.refund).toHaveBeenCalledWith("pi_test_123");
      expect(deps.registrationRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("given an unknown event type", () => {
    it("should return handled=false", async () => {
      const deps = makeDeps({
        paymentService: {
          handleWebhookEvent: vi.fn().mockResolvedValue({ type: "unknown" }),
        },
      });

      const result = await handlePaymentWebhook(
        { payload: "raw-body", signature: "sig" },
        deps
      );

      expect(result.handled).toBe(false);
      expect(result.handled === false && result.reason).toContain("Ignored event type");
    });
  });

  describe("given missing metadata in the event", () => {
    it("should return handled=false", async () => {
      const deps = makeDeps({
        paymentService: {
          handleWebhookEvent: vi.fn().mockResolvedValue({
            type: "checkout_completed",
            userId: "",
            momentId: "moment-1",
            circleId: "circle-1",
            paymentIntentId: "pi_test_123",
            receiptUrl: "",
          }),
        },
      });

      const result = await handlePaymentWebhook(
        { payload: "raw-body", signature: "sig" },
        deps
      );

      expect(result.handled).toBe(false);
      expect(result.handled === false && result.reason).toContain("Missing metadata");
    });
  });

  describe("given user is already a Circle member", () => {
    it("should not add membership again", async () => {
      const moment = makeMoment({ id: "moment-1", price: 1500, capacity: 30 });
      const deps = makeDeps({
        paymentService: {
          handleWebhookEvent: vi.fn().mockResolvedValue(checkoutEvent),
        },
        momentRepository: {
          findById: vi.fn().mockResolvedValue(moment),
        },
        registrationRepository: {
          findByStripePaymentIntentId: vi.fn().mockResolvedValue(null),
          countByMomentIdAndStatus: vi.fn().mockResolvedValue(5),
          create: vi.fn().mockResolvedValue(makeRegistration()),
        },
        circleRepository: {
          findMembership: vi.fn().mockResolvedValue(makeMembership()),
        },
      });

      await handlePaymentWebhook(
        { payload: "raw-body", signature: "sig" },
        deps
      );

      expect(deps.circleRepository.addMembership).not.toHaveBeenCalled();
    });
  });

  describe("given a moment not found", () => {
    it("should return handled=false", async () => {
      const deps = makeDeps({
        paymentService: {
          handleWebhookEvent: vi.fn().mockResolvedValue(checkoutEvent),
        },
        registrationRepository: {
          findByStripePaymentIntentId: vi.fn().mockResolvedValue(null),
        },
        momentRepository: {
          findById: vi.fn().mockResolvedValue(null),
        },
      });

      const result = await handlePaymentWebhook(
        { payload: "raw-body", signature: "sig" },
        deps
      );

      expect(result.handled).toBe(false);
      expect(result.handled === false && result.reason).toContain("Moment not found");
    });
  });
});

import { describe, it, expect, vi } from "vitest";
import { handlePaymentWebhook } from "../handle-payment-webhook";
import { createMockMomentRepository, makeMoment } from "./helpers/mock-moment-repository";
import { createMockCircleRepository, makeCircle, makeMembership } from "./helpers/mock-circle-repository";
import { createMockRegistrationRepository, makeRegistration } from "./helpers/mock-registration-repository";
import { createMockPaymentService } from "./helpers/mock-payment-service";

const checkoutEvent = {
  type: "checkout_completed" as const,
  userId: "user-2",
  momentId: "moment-1",
  circleId: "circle-1",
  paymentIntentId: "pi_test_123",
  receiptUrl: "https://pay.stripe.com/receipts/test",
  accountId: "acct_organizer",
};

const circleOnAccount = makeCircle({ id: "circle-1", stripeConnectAccountId: "acct_organizer" });

function makeDeps(overrides: {
  paymentService?: Partial<ReturnType<typeof createMockPaymentService>>;
  momentRepository?: Partial<ReturnType<typeof createMockMomentRepository>>;
  circleRepository?: Partial<ReturnType<typeof createMockCircleRepository>>;
  registrationRepository?: Partial<ReturnType<typeof createMockRegistrationRepository>>;
} = {}) {
  return {
    paymentService: createMockPaymentService(overrides.paymentService),
    momentRepository: createMockMomentRepository(overrides.momentRepository),
    circleRepository: createMockCircleRepository({
      findById: vi.fn().mockResolvedValue(circleOnAccount),
      ...overrides.circleRepository,
    }),
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
          countActiveByMomentId: vi.fn().mockResolvedValue(5),
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
        stripeAccountId: "acct_organizer",
        stripeReceiptUrl: "https://pay.stripe.com/receipts/test",
      });
      expect(deps.circleRepository.addMembership).toHaveBeenCalledWith("circle-1", "user-2", "PLAYER");
    });
  });

  describe("given the registration fails, then Stripe replays the event", () => {
    it("should keep the Circle membership and create the registration on replay", async () => {
      const moment = makeMoment({ id: "moment-1", price: 1500, capacity: 30 });
      const create = vi
        .fn()
        .mockRejectedValueOnce(new Error("DB unavailable"))
        .mockResolvedValueOnce(makeRegistration({ paymentStatus: "PAID" }));
      const deps = makeDeps({
        paymentService: { handleWebhookEvent: vi.fn().mockResolvedValue(checkoutEvent) },
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        registrationRepository: {
          findByStripePaymentIntentId: vi.fn().mockResolvedValue(null),
          countActiveByMomentId: vi.fn().mockResolvedValue(5),
          create,
        },
        circleRepository: {
          findMembership: vi.fn().mockResolvedValue(null),
          addMembership: vi.fn().mockResolvedValue(makeMembership()),
        },
      });

      await expect(
        handlePaymentWebhook({ payload: "raw-body", signature: "sig" }, deps)
      ).rejects.toThrow("DB unavailable");
      expect(deps.circleRepository.addMembership).toHaveBeenCalledWith("circle-1", "user-2", "PLAYER");

      const replay = await handlePaymentWebhook({ payload: "raw-body", signature: "sig" }, deps);

      expect(replay.handled).toBe(true);
      expect(create).toHaveBeenCalledTimes(2);
    });
  });

  describe("given a refund refused while the event is full", () => {
    it("should report the failure once instead of replaying the event", async () => {
      const deps = makeDeps({
        paymentService: {
          handleWebhookEvent: vi.fn().mockResolvedValue(checkoutEvent),
          refund: vi.fn().mockResolvedValue({ status: "failed" }),
        },
        momentRepository: {
          findById: vi.fn().mockResolvedValue(makeMoment({ id: "moment-1", price: 1500, capacity: 10 })),
        },
        registrationRepository: {
          findByStripePaymentIntentId: vi.fn().mockResolvedValue(null),
          countActiveByMomentId: vi.fn().mockResolvedValue(10),
        },
      });

      const result = await handlePaymentWebhook({ payload: "raw-body", signature: "sig" }, deps);

      expect(result.handled).toBe(false);
      if (!result.handled) {
        expect(result.refundFailure).toEqual({ momentId: "moment-1", userId: "user-2" });
      }
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
        },
        momentRepository: {
          findById: vi.fn().mockResolvedValue(moment),
        },
        registrationRepository: {
          findByStripePaymentIntentId: vi.fn().mockResolvedValue(null),
          countActiveByMomentId: vi.fn().mockResolvedValue(10), // capacity = 10 → full
        },
      });

      const result = await handlePaymentWebhook(
        { payload: "raw-body", signature: "sig" },
        deps
      );

      expect(result.handled).toBe(false);
      expect(deps.paymentService.refund).toHaveBeenCalledWith({
        paymentIntentId: "pi_test_123",
        accountId: "acct_organizer",
      });
      expect(deps.registrationRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("given an event no longer open when the payment arrives", () => {
    it.each([
      ["cancelled", makeMoment({ id: "moment-1", price: 1500, status: "CANCELLED" })],
      ["past", makeMoment({ id: "moment-1", price: 1500, status: "PAST" })],
      ["back to draft", makeMoment({ id: "moment-1", price: 1500, status: "DRAFT" })],
      ["made free", makeMoment({ id: "moment-1", price: 0, status: "PUBLISHED" })],
      ["deleted", null],
    ])("should refund the Participant when the event is %s", async (_label, moment) => {
      const deps = makeDeps({
        paymentService: { handleWebhookEvent: vi.fn().mockResolvedValue(checkoutEvent) },
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        registrationRepository: {
          findByStripePaymentIntentId: vi.fn().mockResolvedValue(null),
        },
      });

      const result = await handlePaymentWebhook({ payload: "raw-body", signature: "sig" }, deps);

      expect(result.handled).toBe(false);
      expect(deps.paymentService.refund).toHaveBeenCalledWith({
        paymentIntentId: "pi_test_123",
        accountId: "acct_organizer",
      });
      expect(deps.registrationRepository.create).not.toHaveBeenCalled();
      expect(deps.circleRepository.addMembership).not.toHaveBeenCalled();
    });
  });

  describe("given a second payment for a Participant already paid", () => {
    it("should refund the second payment and keep the first one", async () => {
      const deps = makeDeps({
        paymentService: {
          handleWebhookEvent: vi.fn().mockResolvedValue({ ...checkoutEvent, paymentIntentId: "pi_second" }),
        },
        momentRepository: {
          findById: vi.fn().mockResolvedValue(makeMoment({ id: "moment-1", price: 1500, capacity: null })),
        },
        registrationRepository: {
          findByStripePaymentIntentId: vi.fn().mockResolvedValue(null),
          findByMomentAndUser: vi.fn().mockResolvedValue(
            makeRegistration({ status: "REGISTERED", paymentStatus: "PAID", stripePaymentIntentId: "pi_first" })
          ),
        },
      });

      const result = await handlePaymentWebhook({ payload: "raw-body", signature: "sig" }, deps);

      expect(result.handled).toBe(false);
      expect(deps.paymentService.refund).toHaveBeenCalledWith({
        paymentIntentId: "pi_second",
        accountId: "acct_organizer",
      });
      expect(deps.registrationRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("given a payment on another account than the Circle's", () => {
    it("should refund it without creating a registration", async () => {
      const deps = makeDeps({
        paymentService: {
          handleWebhookEvent: vi.fn().mockResolvedValue({ ...checkoutEvent, accountId: "acct_other" }),
        },
        momentRepository: {
          findById: vi.fn().mockResolvedValue(makeMoment({ id: "moment-1", price: 1500 })),
        },
        registrationRepository: {
          findByStripePaymentIntentId: vi.fn().mockResolvedValue(null),
        },
      });

      const result = await handlePaymentWebhook({ payload: "raw-body", signature: "sig" }, deps);

      expect(result.handled).toBe(false);
      expect(deps.paymentService.refund).toHaveBeenCalledWith({
        paymentIntentId: "pi_test_123",
        accountId: "acct_other",
      });
      expect(deps.registrationRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("given a charge_refunded event", () => {
    const refundEvent = {
      type: "charge_refunded" as const,
      paymentIntentId: "pi_test_123",
      accountId: "acct_organizer",
    };

    it("should mark a PAID registration REFUNDED and keep it registered", async () => {
      const deps = makeDeps({
        paymentService: { handleWebhookEvent: vi.fn().mockResolvedValue(refundEvent) },
        registrationRepository: {
          findByStripePaymentIntentId: vi.fn().mockResolvedValue(
            makeRegistration({ id: "reg-1", status: "REGISTERED", paymentStatus: "PAID" })
          ),
        },
      });

      const result = await handlePaymentWebhook({ payload: "raw-body", signature: "sig" }, deps);

      expect(result.handled).toBe(false);
      expect(deps.registrationRepository.update).toHaveBeenCalledWith("reg-1", { paymentStatus: "REFUNDED" });
    });

    it.each([
      ["already refunded", makeRegistration({ paymentStatus: "REFUNDED" })],
      ["unknown", null],
    ])("should do nothing when the registration is %s", async (_label, registration) => {
      const deps = makeDeps({
        paymentService: { handleWebhookEvent: vi.fn().mockResolvedValue(refundEvent) },
        registrationRepository: {
          findByStripePaymentIntentId: vi.fn().mockResolvedValue(registration),
        },
      });

      await handlePaymentWebhook({ payload: "raw-body", signature: "sig" }, deps);

      expect(deps.registrationRepository.update).not.toHaveBeenCalled();
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
          countActiveByMomentId: vi.fn().mockResolvedValue(5),
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

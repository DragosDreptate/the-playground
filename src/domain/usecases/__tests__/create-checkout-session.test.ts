import { describe, it, expect, vi } from "vitest";
import { createCheckoutSession } from "../create-checkout-session";
import { createMockMomentRepository, makeMoment } from "./helpers/mock-moment-repository";
import { createMockCircleRepository, makeCircle } from "./helpers/mock-circle-repository";
import { createMockRegistrationRepository, makeRegistration } from "./helpers/mock-registration-repository";
import { createMockPaymentService } from "./helpers/mock-payment-service";
import { makeUser } from "./helpers/mock-user-repository";
import {
  MomentNotFoundError,
  MomentNotOpenForRegistrationError,
  AlreadyRegisteredError,
  InvalidPriceError,
  StripeConnectNotActiveError,
} from "@/domain/errors";

const user = makeUser({ id: "user-2", email: "player@test.com" });
const successUrl = "https://the-playground.fr/m/test-event?payment=success";
const cancelUrl = "https://the-playground.fr/m/test-event?payment=cancelled";

function makeDeps(overrides: {
  momentRepository?: Partial<ReturnType<typeof createMockMomentRepository>>;
  circleRepository?: Partial<ReturnType<typeof createMockCircleRepository>>;
  registrationRepository?: Partial<ReturnType<typeof createMockRegistrationRepository>>;
  paymentService?: Partial<ReturnType<typeof createMockPaymentService>>;
} = {}) {
  return {
    momentRepository: createMockMomentRepository(overrides.momentRepository),
    circleRepository: createMockCircleRepository(overrides.circleRepository),
    registrationRepository: createMockRegistrationRepository(overrides.registrationRepository),
    paymentService: createMockPaymentService(overrides.paymentService),
  };
}

describe("createCheckoutSession", () => {
  describe("given a valid paid published moment with Stripe Connect active", () => {
    it("should create a checkout session and return the URL", async () => {
      const moment = makeMoment({ id: "moment-1", price: 1500, status: "PUBLISHED", capacity: 30 });
      const circle = makeCircle({ id: "circle-1", stripeConnectAccountId: "acct_test_123" });
      const deps = makeDeps({
        momentRepository: {
          findById: vi.fn().mockResolvedValue(moment),
        },
        circleRepository: {
          findById: vi.fn().mockResolvedValue(circle),
        },
        registrationRepository: {
          findByMomentAndUser: vi.fn().mockResolvedValue(null),
          countActiveByMomentId: vi.fn().mockResolvedValue(0),
        },
        paymentService: {
          getConnectAccountStatus: vi.fn().mockResolvedValue("active"),
          createCheckoutSession: vi.fn().mockResolvedValue({
            url: "https://checkout.stripe.com/pay/cs_test_123",
            sessionId: "cs_test_123",
          }),
        },
      });

      const result = await createCheckoutSession(
        { momentId: "moment-1", user, successUrl, cancelUrl },
        deps
      );

      expect(result.url).toBe("https://checkout.stripe.com/pay/cs_test_123");
      expect(result.sessionId).toBe("cs_test_123");
      expect(deps.paymentService.createCheckoutSession).toHaveBeenCalledWith({
        moment,
        user,
        circle,
        successUrl,
        cancelUrl,
      });
    });
  });

  describe("given a non-existent moment", () => {
    it("should throw MomentNotFoundError", async () => {
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(null) },
      });

      await expect(
        createCheckoutSession({ momentId: "non-existent", user, successUrl, cancelUrl }, deps)
      ).rejects.toThrow(MomentNotFoundError);
    });
  });

  describe("given a DRAFT moment", () => {
    it("should throw MomentNotOpenForRegistrationError", async () => {
      const moment = makeMoment({ status: "DRAFT", price: 1500 });
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
      });

      await expect(
        createCheckoutSession({ momentId: "moment-1", user, successUrl, cancelUrl }, deps)
      ).rejects.toThrow(MomentNotOpenForRegistrationError);
    });
  });

  describe("given a free event (price = 0)", () => {
    it("should throw InvalidPriceError", async () => {
      const moment = makeMoment({ price: 0, status: "PUBLISHED" });
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
      });

      await expect(
        createCheckoutSession({ momentId: "moment-1", user, successUrl, cancelUrl }, deps)
      ).rejects.toThrow(InvalidPriceError);
    });
  });

  describe("given a Circle without Stripe Connect", () => {
    it("should throw StripeConnectNotActiveError", async () => {
      const moment = makeMoment({ price: 1500, status: "PUBLISHED" });
      const circle = makeCircle({ stripeConnectAccountId: null });
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        circleRepository: { findById: vi.fn().mockResolvedValue(circle) },
      });

      await expect(
        createCheckoutSession({ momentId: "moment-1", user, successUrl, cancelUrl }, deps)
      ).rejects.toThrow(StripeConnectNotActiveError);
    });
  });

  describe("given a Circle with Stripe Connect in pending status", () => {
    it("should throw StripeConnectNotActiveError", async () => {
      const moment = makeMoment({ price: 1500, status: "PUBLISHED" });
      const circle = makeCircle({ stripeConnectAccountId: "acct_pending" });
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        circleRepository: { findById: vi.fn().mockResolvedValue(circle) },
        paymentService: { getConnectAccountStatus: vi.fn().mockResolvedValue("pending") },
      });

      await expect(
        createCheckoutSession({ momentId: "moment-1", user, successUrl, cancelUrl }, deps)
      ).rejects.toThrow(StripeConnectNotActiveError);
    });
  });

  describe("given the user is already registered", () => {
    it("should throw AlreadyRegisteredError", async () => {
      const moment = makeMoment({ price: 1500, status: "PUBLISHED" });
      const circle = makeCircle({ stripeConnectAccountId: "acct_test_123" });
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        circleRepository: { findById: vi.fn().mockResolvedValue(circle) },
        paymentService: { getConnectAccountStatus: vi.fn().mockResolvedValue("active") },
        registrationRepository: {
          findByMomentAndUser: vi.fn().mockResolvedValue(makeRegistration({ status: "REGISTERED" })),
        },
      });

      await expect(
        createCheckoutSession({ momentId: "moment-1", user, successUrl, cancelUrl }, deps)
      ).rejects.toThrow(AlreadyRegisteredError);
    });
  });

  describe("given the user previously cancelled their registration", () => {
    it("should allow creating a new checkout session", async () => {
      const moment = makeMoment({ price: 1500, status: "PUBLISHED", capacity: 30 });
      const circle = makeCircle({ stripeConnectAccountId: "acct_test_123" });
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        circleRepository: { findById: vi.fn().mockResolvedValue(circle) },
        paymentService: {
          getConnectAccountStatus: vi.fn().mockResolvedValue("active"),
          createCheckoutSession: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/pay/cs_test_456", sessionId: "cs_test_456" }),
        },
        registrationRepository: {
          findByMomentAndUser: vi.fn().mockResolvedValue(makeRegistration({ status: "CANCELLED" })),
          countActiveByMomentId: vi.fn().mockResolvedValue(0),
        },
      });

      const result = await createCheckoutSession(
        { momentId: "moment-1", user, successUrl, cancelUrl },
        deps
      );

      expect(result.url).toBe("https://checkout.stripe.com/pay/cs_test_456");
    });
  });

  describe("given the event is full (no waitlist for paid events)", () => {
    it("should throw MomentNotOpenForRegistrationError", async () => {
      const moment = makeMoment({ price: 1500, status: "PUBLISHED", capacity: 10 });
      const circle = makeCircle({ stripeConnectAccountId: "acct_test_123" });
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        circleRepository: { findById: vi.fn().mockResolvedValue(circle) },
        paymentService: { getConnectAccountStatus: vi.fn().mockResolvedValue("active") },
        registrationRepository: {
          findByMomentAndUser: vi.fn().mockResolvedValue(null),
          countActiveByMomentId: vi.fn().mockResolvedValue(10), // capacity = 10 → full
        },
      });

      await expect(
        createCheckoutSession({ momentId: "moment-1", user, successUrl, cancelUrl }, deps)
      ).rejects.toThrow(MomentNotOpenForRegistrationError);
    });
  });

  describe("given an event with unlimited capacity", () => {
    it("should create a checkout session without capacity check", async () => {
      const moment = makeMoment({ price: 1500, status: "PUBLISHED", capacity: null });
      const circle = makeCircle({ stripeConnectAccountId: "acct_test_123" });
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        circleRepository: { findById: vi.fn().mockResolvedValue(circle) },
        paymentService: {
          getConnectAccountStatus: vi.fn().mockResolvedValue("active"),
          createCheckoutSession: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/pay/cs_test_789", sessionId: "cs_test_789" }),
        },
        registrationRepository: {
          findByMomentAndUser: vi.fn().mockResolvedValue(null),
        },
      });

      const result = await createCheckoutSession(
        { momentId: "moment-1", user, successUrl, cancelUrl },
        deps
      );

      expect(result.url).toBe("https://checkout.stripe.com/pay/cs_test_789");
      expect(deps.registrationRepository.countActiveByMomentId).not.toHaveBeenCalled();
    });
  });
});

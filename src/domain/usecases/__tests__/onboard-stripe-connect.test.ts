import { describe, it, expect, vi } from "vitest";
import { onboardStripeConnect, getStripeConnectStatus } from "../onboard-stripe-connect";
import { createMockCircleRepository, makeCircle, makeMembership } from "./helpers/mock-circle-repository";
import { createMockPaymentService } from "./helpers/mock-payment-service";
import { CircleNotFoundError, UnauthorizedCircleActionError } from "@/domain/errors";

describe("onboardStripeConnect", () => {
  const userId = "user-1";
  const circleId = "circle-1";
  const returnUrl = "https://the-playground.fr/dashboard/circles/my-circle/edit";

  describe("given a HOST with no existing Stripe account", () => {
    it("should create a Connect account, save it, and return onboarding URL", async () => {
      const circle = makeCircle({ id: circleId, stripeConnectAccountId: null });
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(makeMembership({ userId, circleId, role: "HOST" })),
        update: vi.fn().mockResolvedValue(circle),
      });
      const paymentService = createMockPaymentService({
        createConnectAccount: vi.fn().mockResolvedValue({ accountId: "acct_new_123" }),
        getConnectAccountStatus: vi.fn().mockResolvedValue("pending"),
        createOnboardingLink: vi.fn().mockResolvedValue({ url: "https://connect.stripe.com/setup/new" }),
      });

      const result = await onboardStripeConnect(
        { circleId, userId, returnUrl },
        { circleRepository: circleRepo, paymentService }
      );

      expect(paymentService.createConnectAccount).toHaveBeenCalledWith(circle);
      expect(circleRepo.update).toHaveBeenCalledWith(circleId, {
        stripeConnectAccountId: "acct_new_123",
      });
      expect(result.onboardingUrl).toBe("https://connect.stripe.com/setup/new");
    });
  });

  describe("given a HOST with a pending Stripe account", () => {
    it("should return onboarding URL without creating a new account", async () => {
      const circle = makeCircle({ id: circleId, stripeConnectAccountId: "acct_existing_456" });
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(makeMembership({ userId, circleId, role: "HOST" })),
      });
      const paymentService = createMockPaymentService({
        getConnectAccountStatus: vi.fn().mockResolvedValue("pending"),
        createOnboardingLink: vi.fn().mockResolvedValue({ url: "https://connect.stripe.com/setup/resume" }),
      });

      const result = await onboardStripeConnect(
        { circleId, userId, returnUrl },
        { circleRepository: circleRepo, paymentService }
      );

      expect(paymentService.createConnectAccount).not.toHaveBeenCalled();
      expect(result.onboardingUrl).toBe("https://connect.stripe.com/setup/resume");
    });
  });

  describe("given a HOST with an active Stripe account", () => {
    it("should return the Express Dashboard login link", async () => {
      const circle = makeCircle({ id: circleId, stripeConnectAccountId: "acct_active_789" });
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(makeMembership({ userId, circleId, role: "HOST" })),
      });
      const paymentService = createMockPaymentService({
        getConnectAccountStatus: vi.fn().mockResolvedValue("active"),
        createLoginLink: vi.fn().mockResolvedValue({ url: "https://connect.stripe.com/express/dashboard" }),
      });

      const result = await onboardStripeConnect(
        { circleId, userId, returnUrl },
        { circleRepository: circleRepo, paymentService }
      );

      expect(paymentService.createLoginLink).toHaveBeenCalledWith("acct_active_789");
      expect(result.onboardingUrl).toBe("https://connect.stripe.com/express/dashboard");
    });
  });

  describe("given a non-HOST user", () => {
    it("should throw UnauthorizedCircleActionError", async () => {
      const circle = makeCircle({ id: circleId });
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(makeMembership({ userId, circleId, role: "PLAYER" })),
      });
      const paymentService = createMockPaymentService();

      await expect(
        onboardStripeConnect(
          { circleId, userId, returnUrl },
          { circleRepository: circleRepo, paymentService }
        )
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });

  describe("given a non-existent circle", () => {
    it("should throw CircleNotFoundError", async () => {
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(null),
      });
      const paymentService = createMockPaymentService();

      await expect(
        onboardStripeConnect(
          { circleId: "non-existent", userId, returnUrl },
          { circleRepository: circleRepo, paymentService }
        )
      ).rejects.toThrow(CircleNotFoundError);
    });
  });
});

describe("getStripeConnectStatus", () => {
  const userId = "user-1";
  const circleId = "circle-1";

  describe("given a circle with no Stripe account", () => {
    it("should return hasAccount=false and status=null", async () => {
      const circle = makeCircle({ id: circleId, stripeConnectAccountId: null });
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(makeMembership({ userId, circleId, role: "HOST" })),
      });
      const paymentService = createMockPaymentService();

      const result = await getStripeConnectStatus(
        { circleId, userId },
        { circleRepository: circleRepo, paymentService }
      );

      expect(result.hasAccount).toBe(false);
      expect(result.status).toBeNull();
      expect(paymentService.getConnectAccountStatus).not.toHaveBeenCalled();
    });
  });

  describe("given a circle with an active Stripe account", () => {
    it("should return hasAccount=true and the account status", async () => {
      const circle = makeCircle({ id: circleId, stripeConnectAccountId: "acct_123" });
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(makeMembership({ userId, circleId, role: "HOST" })),
      });
      const paymentService = createMockPaymentService({
        getConnectAccountStatus: vi.fn().mockResolvedValue("active"),
      });

      const result = await getStripeConnectStatus(
        { circleId, userId },
        { circleRepository: circleRepo, paymentService }
      );

      expect(result.hasAccount).toBe(true);
      expect(result.status).toBe("active");
    });
  });

  describe("given a non-HOST user", () => {
    it("should throw UnauthorizedCircleActionError", async () => {
      const circle = makeCircle({ id: circleId });
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(null),
      });
      const paymentService = createMockPaymentService();

      await expect(
        getStripeConnectStatus(
          { circleId, userId },
          { circleRepository: circleRepo, paymentService }
        )
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });
});

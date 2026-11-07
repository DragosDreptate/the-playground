import { describe, it, expect, vi } from "vitest";
import { deleteMoment } from "@/domain/usecases/delete-moment";
import {
  MomentNotFoundError,
  UnauthorizedMomentActionError,
  MomentRefundsFailedError,
} from "@/domain/errors";
import {
  createMockMomentRepository,
  makeMoment,
} from "./helpers/mock-moment-repository";
import {
  createMockCircleRepository,
  makeMembership,
} from "./helpers/mock-circle-repository";
import {
  createMockRegistrationRepository,
  makeRegistration,
} from "./helpers/mock-registration-repository";
import { createMockPaymentService } from "./helpers/mock-payment-service";

describe("DeleteMoment", () => {
  const defaultInput = {
    momentId: "moment-1",
    userId: "user-1",
  };

  describe("given a HOST user deleting an existing Moment", () => {
    it("should delete the Moment", async () => {
      const existing = makeMoment({ id: "moment-1", circleId: "circle-1" });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(existing),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
      });

      await deleteMoment(defaultInput, {
        momentRepository: momentRepo,
        circleRepository: circleRepo, registrationRepository: createMockRegistrationRepository(), paymentService: createMockPaymentService() });

      expect(momentRepo.delete).toHaveBeenCalledWith("moment-1");
    });

    it("should verify HOST membership on the Moment's Circle", async () => {
      const existing = makeMoment({ id: "moment-1", circleId: "circle-1" });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(existing),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
      });

      await deleteMoment(defaultInput, {
        momentRepository: momentRepo,
        circleRepository: circleRepo, registrationRepository: createMockRegistrationRepository(), paymentService: createMockPaymentService() });

      expect(circleRepo.findMembership).toHaveBeenCalledWith(
        "circle-1",
        "user-1"
      );
    });
  });

  describe("given a non-existing Moment", () => {
    it("should throw MomentNotFoundError", async () => {
      const momentRepo = createMockMomentRepository();
      const circleRepo = createMockCircleRepository();

      await expect(
        deleteMoment(defaultInput, {
          momentRepository: momentRepo,
          circleRepository: circleRepo, registrationRepository: createMockRegistrationRepository(), paymentService: createMockPaymentService() })
      ).rejects.toThrow(MomentNotFoundError);
    });
  });

  describe("given a user who is not a member of the Circle", () => {
    it("should throw UnauthorizedMomentActionError", async () => {
      const existing = makeMoment({ id: "moment-1", circleId: "circle-1" });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(existing),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      });

      await expect(
        deleteMoment(defaultInput, {
          momentRepository: momentRepo,
          circleRepository: circleRepo, registrationRepository: createMockRegistrationRepository(), paymentService: createMockPaymentService() })
      ).rejects.toThrow(UnauthorizedMomentActionError);
    });
  });

  describe("given a user who is PLAYER (not HOST) of the Circle", () => {
    it("should throw UnauthorizedMomentActionError", async () => {
      const existing = makeMoment({ id: "moment-1", circleId: "circle-1" });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(existing),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi
          .fn()
          .mockResolvedValue(makeMembership({ role: "PLAYER" })),
      });

      await expect(
        deleteMoment(defaultInput, {
          momentRepository: momentRepo,
          circleRepository: circleRepo, registrationRepository: createMockRegistrationRepository(), paymentService: createMockPaymentService() })
      ).rejects.toThrow(UnauthorizedMomentActionError);
    });
  });

  describe("given a paid event with PAID registrations", () => {
    it("should refund all PAID registrations before deleting (force=true)", async () => {
      const existing = makeMoment({ id: "moment-1", circleId: "circle-1", price: 1500 });
      const paidReg1 = makeRegistration({ id: "reg-1", paymentStatus: "PAID", stripePaymentIntentId: "pi_1", stripeAccountId: "acct_test" });
      const paidReg2 = makeRegistration({ id: "reg-2", paymentStatus: "PAID", stripePaymentIntentId: "pi_2", stripeAccountId: "acct_test" });
      const freeReg = makeRegistration({ id: "reg-3", paymentStatus: "NONE" });

      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(existing),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
      });
      const registrationRepo = createMockRegistrationRepository({
        findActiveByMomentId: vi.fn().mockResolvedValue([paidReg1, paidReg2, freeReg]),
      });
      const paymentService = createMockPaymentService();

      await deleteMoment(defaultInput, {
        momentRepository: momentRepo,
        circleRepository: circleRepo,
        registrationRepository: registrationRepo,
        paymentService,
      });

      // Should refund only the 2 PAID registrations, not the free one
      expect(paymentService.refund).toHaveBeenCalledTimes(2);
      expect(paymentService.refund).toHaveBeenCalledWith({ paymentIntentId: "pi_1", accountId: "acct_test" });
      expect(paymentService.refund).toHaveBeenCalledWith({ paymentIntentId: "pi_2", accountId: "acct_test" });
      expect(momentRepo.delete).toHaveBeenCalledWith("moment-1");
    });
  });

  describe("given a free event being deleted", () => {
    it("should not attempt any refunds", async () => {
      const existing = makeMoment({ id: "moment-1", circleId: "circle-1", price: 0 });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(existing),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
      });
      const registrationRepo = createMockRegistrationRepository();
      const paymentService = createMockPaymentService();

      await deleteMoment(defaultInput, {
        momentRepository: momentRepo,
        circleRepository: circleRepo,
        registrationRepository: registrationRepo,
        paymentService,
      });

      expect(registrationRepo.findActiveByMomentId).not.toHaveBeenCalled();
      expect(paymentService.refund).not.toHaveBeenCalled();
    });
  });

  describe("given a refund refused by Stripe", () => {
    it("should keep the event and report who was not refunded", async () => {
      const existing = makeMoment({ id: "moment-1", circleId: "circle-1", price: 1500 });
      const paidReg = makeRegistration({ id: "reg-1", userId: "user-9", paymentStatus: "PAID", stripePaymentIntentId: "pi_1", stripeAccountId: "acct_test" });
      const momentRepo = createMockMomentRepository({ findById: vi.fn().mockResolvedValue(existing) });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
      });
      const registrationRepo = createMockRegistrationRepository({
        findActiveByMomentId: vi.fn().mockResolvedValue([paidReg]),
      });
      const paymentService = createMockPaymentService({
        refund: vi.fn().mockResolvedValue({ status: "failed" }),
      });

      const failure = await deleteMoment(
        { momentId: "moment-1", userId: "user-1" },
        { momentRepository: momentRepo, circleRepository: circleRepo, registrationRepository: registrationRepo, paymentService }
      ).catch((error) => error);

      expect(failure).toBeInstanceOf(MomentRefundsFailedError);
      expect(failure.participantUserIds).toEqual(["user-9"]);
      expect(momentRepo.delete).not.toHaveBeenCalled();
    });
  });
});

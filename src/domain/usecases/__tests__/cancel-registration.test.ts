import { describe, it, expect, vi } from "vitest";
import { cancelRegistration } from "@/domain/usecases/cancel-registration";
import {
  RegistrationNotFoundError,
  UnauthorizedRegistrationActionError,
  OrganizerCannotCancelRegistrationError,
} from "@/domain/errors";
import {
  createMockRegistrationRepository,
  makeRegistration,
} from "./helpers/mock-registration-repository";
import { createMockPaymentService } from "./helpers/mock-payment-service";
import {
  createMockMomentRepository,
  makeMoment,
} from "./helpers/mock-moment-repository";
import {
  createMockCircleRepository,
  makeMembership,
} from "./helpers/mock-circle-repository";

function makeDeps(overrides: {
  registrationRepo?: ReturnType<typeof createMockRegistrationRepository>;
  momentRepo?: ReturnType<typeof createMockMomentRepository>;
  circleRepo?: ReturnType<typeof createMockCircleRepository>;
} = {}) {
  return {
    registrationRepository:
      overrides.registrationRepo ?? createMockRegistrationRepository(),
    momentRepository:
      overrides.momentRepo ??
      createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment()),
      }),
    circleRepository:
      overrides.circleRepo ??
      createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      }),
  };
}

describe("CancelRegistration", () => {
  const defaultInput = {
    registrationId: "registration-1",
    userId: "user-2",
  };

  describe("given a REGISTERED Player cancelling", () => {
    it("should set CANCELLED and promote first WAITLISTED", async () => {
      const waitlistedReg = makeRegistration({
        id: "registration-2",
        userId: "user-3",
        status: "WAITLISTED",
      });
      const promotedReg = makeRegistration({
        id: "registration-2",
        userId: "user-3",
        status: "REGISTERED",
      });

      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(
          makeRegistration({ status: "REGISTERED" })
        ),
        update: vi
          .fn()
          .mockResolvedValueOnce(
            makeRegistration({ status: "CANCELLED", cancelledAt: new Date() })
          )
          .mockResolvedValueOnce(promotedReg),
        findFirstWaitlisted: vi.fn().mockResolvedValue(waitlistedReg),
      });

      const result = await cancelRegistration(
        defaultInput,
        makeDeps({ registrationRepo })
      );

      expect(result.registration.status).toBe("CANCELLED");
      expect(result.promotedRegistration).not.toBeNull();
      expect(result.promotedRegistration!.status).toBe("REGISTERED");
      expect(registrationRepo.update).toHaveBeenCalledTimes(2);
    });
  });

  describe("given no waitlisted users", () => {
    it("should cancel without promotion", async () => {
      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(
          makeRegistration({ status: "REGISTERED" })
        ),
        update: vi.fn().mockResolvedValue(
          makeRegistration({ status: "CANCELLED", cancelledAt: new Date() })
        ),
        findFirstWaitlisted: vi.fn().mockResolvedValue(null),
      });

      const result = await cancelRegistration(
        defaultInput,
        makeDeps({ registrationRepo })
      );

      expect(result.registration.status).toBe("CANCELLED");
      expect(result.promotedRegistration).toBeNull();
      expect(registrationRepo.update).toHaveBeenCalledTimes(1);
    });
  });

  describe("given a WAITLISTED Player cancelling", () => {
    it("should cancel without promoting anyone", async () => {
      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(
          makeRegistration({ status: "WAITLISTED" })
        ),
        update: vi.fn().mockResolvedValue(
          makeRegistration({ status: "CANCELLED", cancelledAt: new Date() })
        ),
      });

      const result = await cancelRegistration(
        defaultInput,
        makeDeps({ registrationRepo })
      );

      expect(result.registration.status).toBe("CANCELLED");
      expect(result.promotedRegistration).toBeNull();
      expect(registrationRepo.findFirstWaitlisted).not.toHaveBeenCalled();
    });
  });

  describe("given a Host trying to cancel their registration", () => {
    it("should throw OrganizerCannotCancelRegistrationError", async () => {
      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(
          makeRegistration({ status: "REGISTERED" })
        ),
      });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment({ circleId: "circle-1" })),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(
          makeMembership({ userId: "user-2", circleId: "circle-1", role: "HOST" })
        ),
      });

      await expect(
        cancelRegistration(
          defaultInput,
          makeDeps({ registrationRepo, momentRepo, circleRepo })
        )
      ).rejects.toThrow(OrganizerCannotCancelRegistrationError);
    });
  });

  describe("given another user", () => {
    it("should throw UnauthorizedRegistrationActionError", async () => {
      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(
          makeRegistration({ userId: "other-user" })
        ),
      });

      await expect(
        cancelRegistration(
          defaultInput,
          makeDeps({ registrationRepo })
        )
      ).rejects.toThrow(UnauthorizedRegistrationActionError);
    });
  });

  describe("given non-existent registration", () => {
    it("should throw RegistrationNotFoundError", async () => {
      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(null),
      });

      await expect(
        cancelRegistration(
          defaultInput,
          makeDeps({ registrationRepo })
        )
      ).rejects.toThrow(RegistrationNotFoundError);
    });
  });

  describe("given already CANCELLED", () => {
    it("should throw RegistrationNotFoundError", async () => {
      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(
          makeRegistration({ status: "CANCELLED" })
        ),
      });

      await expect(
        cancelRegistration(
          defaultInput,
          makeDeps({ registrationRepo })
        )
      ).rejects.toThrow(RegistrationNotFoundError);
    });
  });

  describe("given a REGISTERED cancel that frees a spot with multiple waitlisted", () => {
    it("should promote only the first waitlisted (by registeredAt)", async () => {
      const firstWaitlisted = makeRegistration({
        id: "reg-waitlisted-1",
        userId: "user-3",
        status: "WAITLISTED",
        registeredAt: new Date("2026-02-15T10:00:00Z"),
      });

      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(
          makeRegistration({ status: "REGISTERED" })
        ),
        update: vi
          .fn()
          .mockResolvedValueOnce(
            makeRegistration({ status: "CANCELLED", cancelledAt: new Date() })
          )
          .mockResolvedValueOnce(
            makeRegistration({ id: "reg-waitlisted-1", status: "REGISTERED" })
          ),
        findFirstWaitlisted: vi.fn().mockResolvedValue(firstWaitlisted),
      });

      const result = await cancelRegistration(
        defaultInput,
        makeDeps({ registrationRepo })
      );

      expect(registrationRepo.findFirstWaitlisted).toHaveBeenCalledWith("moment-1");
      expect(registrationRepo.update).toHaveBeenCalledTimes(2);
      expect(registrationRepo.update).toHaveBeenLastCalledWith(
        "reg-waitlisted-1",
        { status: "REGISTERED" }
      );
      expect(result.promotedRegistration!.id).toBe("reg-waitlisted-1");
    });
  });

  describe("given a Player who is also a HOST in another Circle", () => {
    it("should allow cancellation (HOST check is per-Circle, not global)", async () => {
      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(
          makeRegistration({ status: "REGISTERED" })
        ),
        update: vi.fn().mockResolvedValue(
          makeRegistration({ status: "CANCELLED", cancelledAt: new Date() })
        ),
        findFirstWaitlisted: vi.fn().mockResolvedValue(null),
      });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment({ circleId: "circle-1" })),
      });
      // User is PLAYER in this Circle (not HOST)
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(
          makeMembership({ userId: "user-2", circleId: "circle-1", role: "PLAYER" })
        ),
      });

      const result = await cancelRegistration(
        defaultInput,
        makeDeps({ registrationRepo, momentRepo, circleRepo })
      );

      expect(result.registration.status).toBe("CANCELLED");
    });
  });

  describe("given a PAID registration on a refundable event", () => {
    it("should refund via PaymentService before cancelling", async () => {
      const paidReg = makeRegistration({
        status: "REGISTERED",
        paymentStatus: "PAID",
        stripePaymentIntentId: "pi_test_refund",
      });
      const paidMoment = makeMoment({ price: 1500, refundable: true });
      const paymentService = createMockPaymentService();
      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(paidReg),
        update: vi.fn().mockResolvedValue({ ...paidReg, status: "CANCELLED" }),
      });
      const deps = makeDeps({
        registrationRepo,
        momentRepo: createMockMomentRepository({
          findById: vi.fn().mockResolvedValue(paidMoment),
        }),
      });

      await cancelRegistration(defaultInput, { ...deps, paymentService });

      expect(paymentService.refund).toHaveBeenCalledWith("pi_test_refund");
    });
  });

  describe("given a PAID registration on a non-refundable event", () => {
    it("should NOT refund but still cancel the registration", async () => {
      const paidReg = makeRegistration({
        status: "REGISTERED",
        paymentStatus: "PAID",
        stripePaymentIntentId: "pi_test_no_refund",
      });
      const nonRefundableMoment = makeMoment({ price: 1500, refundable: false });
      const paymentService = createMockPaymentService();
      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(paidReg),
        update: vi.fn().mockResolvedValue({ ...paidReg, status: "CANCELLED" }),
      });
      const deps = makeDeps({
        registrationRepo,
        momentRepo: createMockMomentRepository({
          findById: vi.fn().mockResolvedValue(nonRefundableMoment),
        }),
      });

      await cancelRegistration(defaultInput, { ...deps, paymentService });

      expect(paymentService.refund).not.toHaveBeenCalled();
      expect(registrationRepo.update).toHaveBeenCalledWith(
        defaultInput.registrationId,
        expect.objectContaining({ status: "CANCELLED" })
      );
    });
  });

  describe("given a free registration (paymentStatus=NONE)", () => {
    it("should NOT call PaymentService at all", async () => {
      const freeReg = makeRegistration({
        status: "REGISTERED",
        paymentStatus: "NONE",
      });
      const freeMoment = makeMoment({ price: 0 });
      const paymentService = createMockPaymentService();
      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(freeReg),
        update: vi.fn().mockResolvedValue({ ...freeReg, status: "CANCELLED" }),
        findFirstWaitlisted: vi.fn().mockResolvedValue(null),
      });
      const deps = makeDeps({
        registrationRepo,
        momentRepo: createMockMomentRepository({
          findById: vi.fn().mockResolvedValue(freeMoment),
        }),
      });

      await cancelRegistration(defaultInput, { ...deps, paymentService });

      expect(paymentService.refund).not.toHaveBeenCalled();
    });
  });

  describe("given a PAID event cancellation — waitlist should NOT be promoted", () => {
    it("should not promote waitlisted users for paid events", async () => {
      const paidReg = makeRegistration({
        status: "REGISTERED",
        paymentStatus: "PAID",
        stripePaymentIntentId: "pi_test_no_promote",
      });
      const paidMoment = makeMoment({ price: 1500, refundable: true });
      const waitlistedReg = makeRegistration({ id: "waitlisted-1", status: "WAITLISTED" });
      const paymentService = createMockPaymentService();
      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(paidReg),
        update: vi.fn().mockResolvedValue({ ...paidReg, status: "CANCELLED" }),
        findFirstWaitlisted: vi.fn().mockResolvedValue(waitlistedReg),
      });
      const deps = makeDeps({
        registrationRepo,
        momentRepo: createMockMomentRepository({
          findById: vi.fn().mockResolvedValue(paidMoment),
        }),
      });

      const result = await cancelRegistration(defaultInput, { ...deps, paymentService });

      expect(result.promotedRegistration).toBeNull();
      expect(registrationRepo.findFirstWaitlisted).not.toHaveBeenCalled();
    });
  });
});

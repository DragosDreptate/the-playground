import { describe, it, expect, vi } from "vitest";
import { cancelMoment } from "@/domain/usecases/cancel-moment";
import {
  MomentNotFoundError,
  UnauthorizedMomentActionError,
  MomentCannotBeCancelledError,
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

describe("CancelMoment", () => {
  const input = { momentId: "moment-1", userId: "user-1" };

  function makeDeps(overrides: {
    moment?: ReturnType<typeof makeMoment> | null;
    membership?: ReturnType<typeof makeMembership> | null;
    registrations?: ReturnType<typeof makeRegistration>[];
  } = {}) {
    const momentRepository = createMockMomentRepository({
      findById: vi.fn().mockResolvedValue(
        overrides.moment === undefined
          ? makeMoment({ id: "moment-1", circleId: "circle-1", status: "PUBLISHED" })
          : overrides.moment
      ),
      update: vi.fn().mockResolvedValue(makeMoment({ id: "moment-1", status: "CANCELLED" })),
    });
    const circleRepository = createMockCircleRepository({
      findMembership: vi.fn().mockResolvedValue(
        overrides.membership === undefined ? makeMembership() : overrides.membership
      ),
    });
    const registrationRepository = createMockRegistrationRepository({
      findActiveByMomentId: vi.fn().mockResolvedValue(overrides.registrations ?? []),
    });
    const paymentService = createMockPaymentService();
    return { momentRepository, circleRepository, registrationRepository, paymentService };
  }

  describe("given a PUBLISHED Moment hosted by an active Organizer", () => {
    it("should transition the Moment to CANCELLED and reject pending approvals", async () => {
      const deps = makeDeps();

      const result = await cancelMoment(input, deps);

      expect(deps.momentRepository.update).toHaveBeenCalledWith("moment-1", {
        status: "CANCELLED",
      });
      expect(deps.registrationRepository.rejectAllPendingApprovals).toHaveBeenCalledWith(
        "moment-1"
      );
      expect(result.moment.status).toBe("CANCELLED");
    });

    it("should refund paid registrations when the event was paid", async () => {
      const deps = makeDeps({
        moment: makeMoment({ id: "moment-1", circleId: "circle-1", status: "PUBLISHED", price: 1500 }),
        registrations: [
          makeRegistration({ paymentStatus: "PAID", stripePaymentIntentId: "pi_123" }),
        ],
      });

      await cancelMoment(input, deps);

      expect(deps.paymentService.refund).toHaveBeenCalledWith("pi_123");
    });

    it("should not attempt any refund for a free event", async () => {
      const deps = makeDeps({
        moment: makeMoment({ id: "moment-1", circleId: "circle-1", status: "PUBLISHED", price: 0 }),
      });

      await cancelMoment(input, deps);

      expect(deps.paymentService.refund).not.toHaveBeenCalled();
    });
  });

  describe("given a non-organizer", () => {
    it("should throw UnauthorizedMomentActionError and not mutate the Moment", async () => {
      const deps = makeDeps({ membership: makeMembership({ role: "PLAYER" }) });

      await expect(cancelMoment(input, deps)).rejects.toThrow(
        UnauthorizedMomentActionError
      );
      expect(deps.momentRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("given a Moment that is not PUBLISHED", () => {
    it.each(["DRAFT", "CANCELLED", "PAST"] as const)(
      "should throw MomentCannotBeCancelledError when status is %s",
      async (status) => {
        const deps = makeDeps({
          moment: makeMoment({ id: "moment-1", circleId: "circle-1", status }),
        });

        await expect(cancelMoment(input, deps)).rejects.toThrow(
          MomentCannotBeCancelledError
        );
        expect(deps.momentRepository.update).not.toHaveBeenCalled();
      }
    );
  });

  describe("given a non-existing Moment", () => {
    it("should throw MomentNotFoundError", async () => {
      const deps = makeDeps({ moment: null });

      await expect(cancelMoment(input, deps)).rejects.toThrow(MomentNotFoundError);
    });
  });
});

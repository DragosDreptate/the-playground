import { describe, it, expect, vi } from "vitest";
import { rejectMomentRegistration } from "@/domain/usecases/reject-moment-registration";
import { createMockCircleRepository, makeMembership } from "./helpers/mock-circle-repository";
import { createMockRegistrationRepository, makeRegistration } from "./helpers/mock-registration-repository";
import { createMockMomentRepository, makeMoment } from "./helpers/mock-moment-repository";
import {
  RegistrationNotFoundError,
  RegistrationNotPendingApprovalError,
  UnauthorizedCircleActionError,
} from "@/domain/errors";

const HOST_ID = "host-user-1";
const CIRCLE_ID = "circle-1";
const MOMENT_ID = "moment-1";
const REG_ID = "reg-1";

function makeDeps(overrides?: {
  circleRepo?: Partial<ReturnType<typeof createMockCircleRepository>>;
  regRepo?: Partial<ReturnType<typeof createMockRegistrationRepository>>;
  momentRepo?: Partial<ReturnType<typeof createMockMomentRepository>>;
}) {
  return {
    circleRepository: createMockCircleRepository(overrides?.circleRepo),
    registrationRepository: createMockRegistrationRepository(overrides?.regRepo),
    momentRepository: createMockMomentRepository(overrides?.momentRepo),
  };
}

describe("rejectMomentRegistration", () => {
  describe("given a non-existent registration", () => {
    it("should throw RegistrationNotFoundError", async () => {
      const deps = makeDeps({
        regRepo: { findById: vi.fn().mockResolvedValue(null) },
      });

      await expect(
        rejectMomentRegistration({ registrationId: REG_ID, hostUserId: HOST_ID }, deps)
      ).rejects.toThrow(RegistrationNotFoundError);
    });
  });

  describe("given a registration that is not PENDING_APPROVAL", () => {
    it("should throw RegistrationNotPendingApprovalError", async () => {
      const deps = makeDeps({
        regRepo: {
          findById: vi.fn().mockResolvedValue(makeRegistration({ id: REG_ID, status: "REGISTERED" })),
        },
      });

      await expect(
        rejectMomentRegistration({ registrationId: REG_ID, hostUserId: HOST_ID }, deps)
      ).rejects.toThrow(RegistrationNotPendingApprovalError);
    });
  });

  describe("given the caller is not a HOST", () => {
    it("should throw UnauthorizedCircleActionError", async () => {
      const deps = makeDeps({
        regRepo: {
          findById: vi.fn().mockResolvedValue(makeRegistration({ id: REG_ID, status: "PENDING_APPROVAL", momentId: MOMENT_ID })),
        },
        momentRepo: {
          findById: vi.fn().mockResolvedValue(makeMoment({ id: MOMENT_ID, circleId: CIRCLE_ID })),
        },
        circleRepo: {
          findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "PLAYER" })),
        },
      });

      await expect(
        rejectMomentRegistration({ registrationId: REG_ID, hostUserId: HOST_ID }, deps)
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });

  describe("given a valid PENDING_APPROVAL registration", () => {
    it("should update status to REJECTED", async () => {
      const update = vi.fn().mockResolvedValue(makeRegistration({ id: REG_ID, status: "REJECTED" }));

      const deps = makeDeps({
        regRepo: {
          findById: vi.fn().mockResolvedValue(makeRegistration({ id: REG_ID, status: "PENDING_APPROVAL", momentId: MOMENT_ID })),
          update,
        },
        momentRepo: {
          findById: vi.fn().mockResolvedValue(makeMoment({ id: MOMENT_ID, circleId: CIRCLE_ID })),
        },
        circleRepo: {
          findMembership: vi.fn().mockResolvedValue(makeMembership({ userId: HOST_ID, role: "HOST" })),
        },
      });

      const result = await rejectMomentRegistration({ registrationId: REG_ID, hostUserId: HOST_ID }, deps);

      expect(update).toHaveBeenCalledWith(REG_ID, { status: "REJECTED" });
      expect(result.status).toBe("REJECTED");
    });
  });
});

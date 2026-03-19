import { describe, it, expect, vi } from "vitest";
import { approveMomentRegistration } from "@/domain/usecases/approve-moment-registration";
import { createMockCircleRepository, makeCircle, makeMembership } from "./helpers/mock-circle-repository";
import { createMockRegistrationRepository, makeRegistration } from "./helpers/mock-registration-repository";
import { createMockMomentRepository, makeMoment } from "./helpers/mock-moment-repository";
import {
  RegistrationNotFoundError,
  RegistrationNotPendingApprovalError,
  UnauthorizedCircleActionError,
} from "@/domain/errors";

const HOST_ID = "host-user-1";
const PLAYER_ID = "player-user-2";
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

describe("approveMomentRegistration", () => {
  describe("given a non-existent registration", () => {
    it("should throw RegistrationNotFoundError", async () => {
      const deps = makeDeps({
        regRepo: { findById: vi.fn().mockResolvedValue(null) },
      });

      await expect(
        approveMomentRegistration({ registrationId: REG_ID, hostUserId: HOST_ID }, deps)
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
        approveMomentRegistration({ registrationId: REG_ID, hostUserId: HOST_ID }, deps)
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
        approveMomentRegistration({ registrationId: REG_ID, hostUserId: HOST_ID }, deps)
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });

  describe("given capacity is available", () => {
    it("should approve to REGISTERED and auto-join Circle as ACTIVE", async () => {
      const update = vi.fn().mockResolvedValue(makeRegistration({ id: REG_ID, status: "REGISTERED" }));
      const addMembership = vi.fn().mockResolvedValue(makeMembership());

      const deps = makeDeps({
        regRepo: {
          findById: vi.fn().mockResolvedValue(makeRegistration({ id: REG_ID, status: "PENDING_APPROVAL", momentId: MOMENT_ID, userId: PLAYER_ID })),
          countByMomentIdAndStatus: vi.fn().mockResolvedValue(5),
          update,
        },
        momentRepo: {
          findById: vi.fn().mockResolvedValue(makeMoment({ id: MOMENT_ID, circleId: CIRCLE_ID, capacity: 30 })),
        },
        circleRepo: {
          findMembership: vi.fn()
            .mockResolvedValueOnce(makeMembership({ userId: HOST_ID, role: "HOST" })) // host check
            .mockResolvedValueOnce(null), // player not yet member
          findById: vi.fn().mockResolvedValue(makeCircle({ id: CIRCLE_ID, requiresApproval: false })),
          addMembership,
        },
      });

      const result = await approveMomentRegistration({ registrationId: REG_ID, hostUserId: HOST_ID }, deps);

      expect(update).toHaveBeenCalledWith(REG_ID, { status: "REGISTERED" });
      expect(addMembership).toHaveBeenCalledWith(CIRCLE_ID, PLAYER_ID, "PLAYER", "ACTIVE");
      expect(result.registration.status).toBe("REGISTERED");
      expect(result.circleAutoJoined).toBe(true);
      expect(result.circleJoinPending).toBe(false);
    });
  });

  describe("given capacity is full", () => {
    it("should approve to WAITLISTED", async () => {
      const update = vi.fn().mockResolvedValue(makeRegistration({ id: REG_ID, status: "WAITLISTED" }));

      const deps = makeDeps({
        regRepo: {
          findById: vi.fn().mockResolvedValue(makeRegistration({ id: REG_ID, status: "PENDING_APPROVAL", momentId: MOMENT_ID, userId: PLAYER_ID })),
          countByMomentIdAndStatus: vi.fn().mockResolvedValue(10),
          update,
        },
        momentRepo: {
          findById: vi.fn().mockResolvedValue(makeMoment({ id: MOMENT_ID, circleId: CIRCLE_ID, capacity: 10 })),
        },
        circleRepo: {
          findMembership: vi.fn()
            .mockResolvedValueOnce(makeMembership({ userId: HOST_ID, role: "HOST" }))
            .mockResolvedValueOnce(null),
          findById: vi.fn().mockResolvedValue(makeCircle({ id: CIRCLE_ID })),
          addMembership: vi.fn().mockResolvedValue(makeMembership()),
        },
      });

      const result = await approveMomentRegistration({ registrationId: REG_ID, hostUserId: HOST_ID }, deps);

      expect(update).toHaveBeenCalledWith(REG_ID, { status: "WAITLISTED" });
      expect(result.registration.status).toBe("WAITLISTED");
    });
  });

  describe("given Circle requires approval", () => {
    it("should auto-join Circle as PENDING", async () => {
      const addMembership = vi.fn().mockResolvedValue(makeMembership({ status: "PENDING" }));

      const deps = makeDeps({
        regRepo: {
          findById: vi.fn().mockResolvedValue(makeRegistration({ id: REG_ID, status: "PENDING_APPROVAL", momentId: MOMENT_ID, userId: PLAYER_ID })),
          countByMomentIdAndStatus: vi.fn().mockResolvedValue(0),
          update: vi.fn().mockResolvedValue(makeRegistration({ status: "REGISTERED" })),
        },
        momentRepo: {
          findById: vi.fn().mockResolvedValue(makeMoment({ id: MOMENT_ID, circleId: CIRCLE_ID })),
        },
        circleRepo: {
          findMembership: vi.fn()
            .mockResolvedValueOnce(makeMembership({ userId: HOST_ID, role: "HOST" }))
            .mockResolvedValueOnce(null),
          findById: vi.fn().mockResolvedValue(makeCircle({ id: CIRCLE_ID, requiresApproval: true })),
          addMembership,
        },
      });

      const result = await approveMomentRegistration({ registrationId: REG_ID, hostUserId: HOST_ID }, deps);

      expect(addMembership).toHaveBeenCalledWith(CIRCLE_ID, PLAYER_ID, "PLAYER", "PENDING");
      expect(result.circleAutoJoined).toBe(false);
      expect(result.circleJoinPending).toBe(true);
    });
  });

  describe("given the player is already a member of the Circle", () => {
    it("should not create a new membership", async () => {
      const addMembership = vi.fn();

      const deps = makeDeps({
        regRepo: {
          findById: vi.fn().mockResolvedValue(makeRegistration({ id: REG_ID, status: "PENDING_APPROVAL", momentId: MOMENT_ID, userId: PLAYER_ID })),
          countByMomentIdAndStatus: vi.fn().mockResolvedValue(0),
          update: vi.fn().mockResolvedValue(makeRegistration({ status: "REGISTERED" })),
        },
        momentRepo: {
          findById: vi.fn().mockResolvedValue(makeMoment({ id: MOMENT_ID, circleId: CIRCLE_ID })),
        },
        circleRepo: {
          findMembership: vi.fn()
            .mockResolvedValueOnce(makeMembership({ userId: HOST_ID, role: "HOST" }))
            .mockResolvedValueOnce(makeMembership({ userId: PLAYER_ID, role: "PLAYER" })), // already member
          addMembership,
        },
      });

      const result = await approveMomentRegistration({ registrationId: REG_ID, hostUserId: HOST_ID }, deps);

      expect(addMembership).not.toHaveBeenCalled();
      expect(result.circleAutoJoined).toBe(false);
      expect(result.circleJoinPending).toBe(false);
    });
  });
});

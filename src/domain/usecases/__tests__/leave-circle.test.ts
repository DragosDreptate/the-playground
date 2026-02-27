import { describe, it, expect, vi } from "vitest";
import { leaveCircle } from "@/domain/usecases/leave-circle";
import { createMockCircleRepository, makeMembership } from "./helpers/mock-circle-repository";
import { createMockRegistrationRepository, makeRegistration } from "./helpers/mock-registration-repository";
import {
  CannotLeaveAsHostError,
  NotMemberOfCircleError,
} from "@/domain/errors";

describe("leaveCircle", () => {
  describe("given a non-member user", () => {
    it("should throw NotMemberOfCircleError", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      });
      const registrationRepo = createMockRegistrationRepository();

      await expect(
        leaveCircle(
          { circleId: "circle-1", userId: "user-1" },
          { circleRepository: circleRepo, registrationRepository: registrationRepo }
        )
      ).rejects.toThrow(NotMemberOfCircleError);
    });
  });

  describe("given a HOST member", () => {
    it("should throw CannotLeaveAsHostError", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
      });
      const registrationRepo = createMockRegistrationRepository();

      await expect(
        leaveCircle(
          { circleId: "circle-1", userId: "user-1" },
          { circleRepository: circleRepo, registrationRepository: registrationRepo }
        )
      ).rejects.toThrow(CannotLeaveAsHostError);
    });
  });

  describe("given a PLAYER with no future registrations", () => {
    it("should remove membership and return 0 cancelled", async () => {
      const removeMembership = vi.fn().mockResolvedValue(undefined);
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "PLAYER" })),
        removeMembership,
      });
      const registrationRepo = createMockRegistrationRepository({
        findFutureActiveByUserAndCircle: vi.fn().mockResolvedValue([]),
      });

      const result = await leaveCircle(
        { circleId: "circle-1", userId: "user-1" },
        { circleRepository: circleRepo, registrationRepository: registrationRepo }
      );

      expect(removeMembership).toHaveBeenCalledWith("circle-1", "user-1");
      expect(result.cancelledRegistrations).toBe(0);
      expect(result.promotedRegistrations).toBe(0);
    });
  });

  describe("given a PLAYER with a REGISTERED future event and someone on waitlist", () => {
    it("should cancel the registration and promote the waitlisted user", async () => {
      const registeredReg = makeRegistration({ id: "reg-1", status: "REGISTERED", momentId: "moment-1" });
      const waitlistedReg = makeRegistration({ id: "reg-2", status: "WAITLISTED", momentId: "moment-1", userId: "user-3" });

      const updateFn = vi.fn().mockResolvedValue({ ...registeredReg, status: "CANCELLED" });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "PLAYER" })),
        removeMembership: vi.fn().mockResolvedValue(undefined),
      });
      const registrationRepo = createMockRegistrationRepository({
        findFutureActiveByUserAndCircle: vi.fn().mockResolvedValue([registeredReg]),
        findFirstWaitlisted: vi.fn().mockResolvedValue(waitlistedReg),
        update: updateFn,
      });

      const result = await leaveCircle(
        { circleId: "circle-1", userId: "user-1" },
        { circleRepository: circleRepo, registrationRepository: registrationRepo }
      );

      expect(updateFn).toHaveBeenCalledWith("reg-1", {
        status: "CANCELLED",
        cancelledAt: expect.any(Date),
      });
      expect(updateFn).toHaveBeenCalledWith("reg-2", { status: "REGISTERED" });
      expect(result.cancelledRegistrations).toBe(1);
      expect(result.promotedRegistrations).toBe(1);
    });
  });

  describe("given a PLAYER with a REGISTERED future event and nobody on waitlist", () => {
    it("should cancel the registration without promotion", async () => {
      const registeredReg = makeRegistration({ id: "reg-1", status: "REGISTERED" });

      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "PLAYER" })),
        removeMembership: vi.fn().mockResolvedValue(undefined),
      });
      const registrationRepo = createMockRegistrationRepository({
        findFutureActiveByUserAndCircle: vi.fn().mockResolvedValue([registeredReg]),
        findFirstWaitlisted: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({ ...registeredReg, status: "CANCELLED" }),
      });

      const result = await leaveCircle(
        { circleId: "circle-1", userId: "user-1" },
        { circleRepository: circleRepo, registrationRepository: registrationRepo }
      );

      expect(result.cancelledRegistrations).toBe(1);
      expect(result.promotedRegistrations).toBe(0);
    });
  });

  describe("given a PLAYER with a WAITLISTED future event", () => {
    it("should cancel the waitlist entry without promoting anyone", async () => {
      const waitlistedReg = makeRegistration({ id: "reg-1", status: "WAITLISTED" });

      const findFirstWaitlisted = vi.fn();
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "PLAYER" })),
        removeMembership: vi.fn().mockResolvedValue(undefined),
      });
      const registrationRepo = createMockRegistrationRepository({
        findFutureActiveByUserAndCircle: vi.fn().mockResolvedValue([waitlistedReg]),
        findFirstWaitlisted,
        update: vi.fn().mockResolvedValue({ ...waitlistedReg, status: "CANCELLED" }),
      });

      const result = await leaveCircle(
        { circleId: "circle-1", userId: "user-1" },
        { circleRepository: circleRepo, registrationRepository: registrationRepo }
      );

      // Pas de promotion pour une entrée WAITLISTED annulée
      expect(findFirstWaitlisted).not.toHaveBeenCalled();
      expect(result.cancelledRegistrations).toBe(1);
      expect(result.promotedRegistrations).toBe(0);
    });
  });

  describe("given a PLAYER who is not following the circle", () => {
    it("should not throw even if unfollowCircle fails", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "PLAYER" })),
        removeMembership: vi.fn().mockResolvedValue(undefined),
        unfollowCircle: vi.fn().mockRejectedValue(new Error("Not following")),
      });
      const registrationRepo = createMockRegistrationRepository({
        findFutureActiveByUserAndCircle: vi.fn().mockResolvedValue([]),
      });

      await expect(
        leaveCircle(
          { circleId: "circle-1", userId: "user-1" },
          { circleRepository: circleRepo, registrationRepository: registrationRepo }
        )
      ).resolves.not.toThrow();
    });
  });
});

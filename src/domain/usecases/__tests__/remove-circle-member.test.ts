import { describe, it, expect, vi } from "vitest";
import { removeCircleMember } from "@/domain/usecases/remove-circle-member";
import { createMockCircleRepository, makeMembership } from "./helpers/mock-circle-repository";
import { createMockRegistrationRepository, makeRegistration } from "./helpers/mock-registration-repository";
import {
  UnauthorizedCircleActionError,
  CannotRemoveSelfError,
  NotMemberOfCircleError,
  CannotRemoveHostError,
} from "@/domain/errors";

const HOST_ID = "host-user-1";
const TARGET_ID = "player-user-2";
const CIRCLE_ID = "circle-1";

function makeHostMembership() {
  return makeMembership({ userId: HOST_ID, role: "HOST" });
}

function makePlayerMembership() {
  return makeMembership({ userId: TARGET_ID, role: "PLAYER" });
}

describe("removeCircleMember", () => {
  describe("given a non-HOST caller", () => {
    it("should throw UnauthorizedCircleActionError", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "PLAYER" })),
      });
      const registrationRepo = createMockRegistrationRepository();

      await expect(
        removeCircleMember(
          { circleId: CIRCLE_ID, hostUserId: HOST_ID, targetUserId: TARGET_ID },
          { circleRepository: circleRepo, registrationRepository: registrationRepo }
        )
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });

  describe("given a non-member caller", () => {
    it("should throw UnauthorizedCircleActionError", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      });
      const registrationRepo = createMockRegistrationRepository();

      await expect(
        removeCircleMember(
          { circleId: CIRCLE_ID, hostUserId: HOST_ID, targetUserId: TARGET_ID },
          { circleRepository: circleRepo, registrationRepository: registrationRepo }
        )
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });

  describe("given the HOST tries to remove themselves", () => {
    it("should throw CannotRemoveSelfError", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeHostMembership()),
      });
      const registrationRepo = createMockRegistrationRepository();

      await expect(
        removeCircleMember(
          { circleId: CIRCLE_ID, hostUserId: HOST_ID, targetUserId: HOST_ID },
          { circleRepository: circleRepo, registrationRepository: registrationRepo }
        )
      ).rejects.toThrow(CannotRemoveSelfError);
    });
  });

  describe("given a target who is not a member", () => {
    it("should throw NotMemberOfCircleError", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi
          .fn()
          .mockResolvedValueOnce(makeHostMembership()) // caller
          .mockResolvedValueOnce(null), // target
      });
      const registrationRepo = createMockRegistrationRepository();

      await expect(
        removeCircleMember(
          { circleId: CIRCLE_ID, hostUserId: HOST_ID, targetUserId: TARGET_ID },
          { circleRepository: circleRepo, registrationRepository: registrationRepo }
        )
      ).rejects.toThrow(NotMemberOfCircleError);
    });
  });

  describe("given a target who is a HOST", () => {
    it("should throw CannotRemoveHostError", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi
          .fn()
          .mockResolvedValueOnce(makeHostMembership()) // caller
          .mockResolvedValueOnce(makeMembership({ userId: TARGET_ID, role: "HOST" })), // target
      });
      const registrationRepo = createMockRegistrationRepository();

      await expect(
        removeCircleMember(
          { circleId: CIRCLE_ID, hostUserId: HOST_ID, targetUserId: TARGET_ID },
          { circleRepository: circleRepo, registrationRepository: registrationRepo }
        )
      ).rejects.toThrow(CannotRemoveHostError);
    });
  });

  describe("given a valid PLAYER with no future registrations", () => {
    it("should remove membership and return 0 cancelled, 0 promoted", async () => {
      const removeMembership = vi.fn().mockResolvedValue(undefined);
      const circleRepo = createMockCircleRepository({
        findMembership: vi
          .fn()
          .mockResolvedValueOnce(makeHostMembership())
          .mockResolvedValueOnce(makePlayerMembership()),
        removeMembership,
      });
      const registrationRepo = createMockRegistrationRepository({
        findFutureActiveByUserAndCircle: vi.fn().mockResolvedValue([]),
      });

      const result = await removeCircleMember(
        { circleId: CIRCLE_ID, hostUserId: HOST_ID, targetUserId: TARGET_ID },
        { circleRepository: circleRepo, registrationRepository: registrationRepo }
      );

      expect(removeMembership).toHaveBeenCalledWith(CIRCLE_ID, TARGET_ID);
      expect(result.cancelledRegistrations).toBe(0);
      expect(result.promotedRegistrations).toBe(0);
    });
  });

  describe("given a PLAYER with a REGISTERED future event and someone on waitlist", () => {
    it("should cancel the registration and promote the waitlisted user", async () => {
      const registeredReg = makeRegistration({ id: "reg-1", status: "REGISTERED", momentId: "moment-1", userId: TARGET_ID });
      const waitlistedReg = makeRegistration({ id: "reg-2", status: "WAITLISTED", momentId: "moment-1", userId: "user-3" });

      const updateFn = vi.fn().mockResolvedValue({ ...registeredReg, status: "CANCELLED" });
      const circleRepo = createMockCircleRepository({
        findMembership: vi
          .fn()
          .mockResolvedValueOnce(makeHostMembership())
          .mockResolvedValueOnce(makePlayerMembership()),
        removeMembership: vi.fn().mockResolvedValue(undefined),
      });
      const registrationRepo = createMockRegistrationRepository({
        findFutureActiveByUserAndCircle: vi.fn().mockResolvedValue([registeredReg]),
        findFirstWaitlisted: vi.fn().mockResolvedValue(waitlistedReg),
        update: updateFn,
      });

      const result = await removeCircleMember(
        { circleId: CIRCLE_ID, hostUserId: HOST_ID, targetUserId: TARGET_ID },
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

  describe("given a PLAYER with a WAITLISTED future event", () => {
    it("should cancel the waitlist entry without promoting anyone", async () => {
      const waitlistedReg = makeRegistration({ id: "reg-1", status: "WAITLISTED", userId: TARGET_ID });

      const findFirstWaitlisted = vi.fn();
      const circleRepo = createMockCircleRepository({
        findMembership: vi
          .fn()
          .mockResolvedValueOnce(makeHostMembership())
          .mockResolvedValueOnce(makePlayerMembership()),
        removeMembership: vi.fn().mockResolvedValue(undefined),
      });
      const registrationRepo = createMockRegistrationRepository({
        findFutureActiveByUserAndCircle: vi.fn().mockResolvedValue([waitlistedReg]),
        findFirstWaitlisted,
        update: vi.fn().mockResolvedValue({ ...waitlistedReg, status: "CANCELLED" }),
      });

      const result = await removeCircleMember(
        { circleId: CIRCLE_ID, hostUserId: HOST_ID, targetUserId: TARGET_ID },
        { circleRepository: circleRepo, registrationRepository: registrationRepo }
      );

      expect(findFirstWaitlisted).not.toHaveBeenCalled();
      expect(result.cancelledRegistrations).toBe(1);
      expect(result.promotedRegistrations).toBe(0);
    });
  });

  describe("given a PLAYER who is not following the circle", () => {
    it("should not throw even if unfollowCircle fails", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi
          .fn()
          .mockResolvedValueOnce(makeHostMembership())
          .mockResolvedValueOnce(makePlayerMembership()),
        removeMembership: vi.fn().mockResolvedValue(undefined),
        unfollowCircle: vi.fn().mockRejectedValue(new Error("Not following")),
      });
      const registrationRepo = createMockRegistrationRepository({
        findFutureActiveByUserAndCircle: vi.fn().mockResolvedValue([]),
      });

      await expect(
        removeCircleMember(
          { circleId: CIRCLE_ID, hostUserId: HOST_ID, targetUserId: TARGET_ID },
          { circleRepository: circleRepo, registrationRepository: registrationRepo }
        )
      ).resolves.not.toThrow();
    });
  });
});

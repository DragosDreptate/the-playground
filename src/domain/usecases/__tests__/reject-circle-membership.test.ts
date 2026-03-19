import { describe, it, expect, vi } from "vitest";
import { rejectCircleMembership } from "@/domain/usecases/reject-circle-membership";
import { createMockCircleRepository, makeMembership } from "./helpers/mock-circle-repository";
import {
  UnauthorizedCircleActionError,
  NotMemberOfCircleError,
  MembershipNotPendingError,
} from "@/domain/errors";

const HOST_ID = "host-user-1";
const MEMBER_ID = "member-user-2";
const CIRCLE_ID = "circle-1";

function makeInput() {
  return { circleId: CIRCLE_ID, memberUserId: MEMBER_ID, hostUserId: HOST_ID };
}

describe("rejectCircleMembership", () => {
  describe("given a non-HOST caller", () => {
    it("should throw UnauthorizedCircleActionError", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "PLAYER" })),
      });

      await expect(
        rejectCircleMembership(makeInput(), { circleRepository: circleRepo })
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });

  describe("given the target membership does not exist", () => {
    it("should throw NotMemberOfCircleError", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn()
          .mockResolvedValueOnce(makeMembership({ userId: HOST_ID, role: "HOST" }))
          .mockResolvedValueOnce(null),
      });

      await expect(
        rejectCircleMembership(makeInput(), { circleRepository: circleRepo })
      ).rejects.toThrow(NotMemberOfCircleError);
    });
  });

  describe("given the target membership is ACTIVE", () => {
    it("should throw MembershipNotPendingError", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn()
          .mockResolvedValueOnce(makeMembership({ userId: HOST_ID, role: "HOST" }))
          .mockResolvedValueOnce(makeMembership({ userId: MEMBER_ID, role: "PLAYER", status: "ACTIVE" })),
      });

      await expect(
        rejectCircleMembership(makeInput(), { circleRepository: circleRepo })
      ).rejects.toThrow(MembershipNotPendingError);
    });
  });

  describe("given a valid PENDING membership", () => {
    it("should remove the membership", async () => {
      const removeMembership = vi.fn().mockResolvedValue(undefined);

      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn()
          .mockResolvedValueOnce(makeMembership({ userId: HOST_ID, role: "HOST" }))
          .mockResolvedValueOnce(makeMembership({ userId: MEMBER_ID, role: "PLAYER", status: "PENDING" })),
        removeMembership,
      });

      await rejectCircleMembership(makeInput(), { circleRepository: circleRepo });

      expect(removeMembership).toHaveBeenCalledWith(CIRCLE_ID, MEMBER_ID);
    });
  });
});

import { describe, it, expect, vi } from "vitest";
import { approveCircleMembership } from "@/domain/usecases/approve-circle-membership";
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

describe("approveCircleMembership", () => {
  describe("given a non-HOST caller", () => {
    it("should throw UnauthorizedCircleActionError", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "PLAYER" })),
      });

      await expect(
        approveCircleMembership(makeInput(), { circleRepository: circleRepo })
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });

  describe("given a non-member caller", () => {
    it("should throw UnauthorizedCircleActionError", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      });

      await expect(
        approveCircleMembership(makeInput(), { circleRepository: circleRepo })
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
        approveCircleMembership(makeInput(), { circleRepository: circleRepo })
      ).rejects.toThrow(NotMemberOfCircleError);
    });
  });

  describe("given the target membership is already ACTIVE", () => {
    it("should throw MembershipNotPendingError", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn()
          .mockResolvedValueOnce(makeMembership({ userId: HOST_ID, role: "HOST" }))
          .mockResolvedValueOnce(makeMembership({ userId: MEMBER_ID, role: "PLAYER", status: "ACTIVE" })),
      });

      await expect(
        approveCircleMembership(makeInput(), { circleRepository: circleRepo })
      ).rejects.toThrow(MembershipNotPendingError);
    });
  });

  describe("given a valid PENDING membership", () => {
    it("should update status to ACTIVE", async () => {
      const approvedMembership = makeMembership({ userId: MEMBER_ID, role: "PLAYER", status: "ACTIVE" });
      const updateMembershipStatus = vi.fn().mockResolvedValue(approvedMembership);

      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn()
          .mockResolvedValueOnce(makeMembership({ userId: HOST_ID, role: "HOST" }))
          .mockResolvedValueOnce(makeMembership({ userId: MEMBER_ID, role: "PLAYER", status: "PENDING" })),
        updateMembershipStatus,
      });

      const result = await approveCircleMembership(makeInput(), { circleRepository: circleRepo });

      expect(updateMembershipStatus).toHaveBeenCalledWith(CIRCLE_ID, MEMBER_ID, "ACTIVE");
      expect(result.status).toBe("ACTIVE");
    });
  });
});

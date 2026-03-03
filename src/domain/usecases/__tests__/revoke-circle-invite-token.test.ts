import { describe, it, expect, vi } from "vitest";
import { revokeCircleInviteToken } from "@/domain/usecases/revoke-circle-invite-token";
import { createMockCircleRepository, makeCircle, makeMembership } from "./helpers/mock-circle-repository";
import { CircleNotFoundError, UnauthorizedCircleActionError } from "@/domain/errors/circle-errors";

describe("RevokeCircleInviteToken", () => {
  const circleId = "circle-1";
  const userId = "user-1";

  describe("given user is HOST", () => {
    it("should set inviteToken to null", async () => {
      const circle = makeCircle({ id: circleId, inviteToken: "some-token" });
      const membership = makeMembership({ circleId, userId, role: "HOST" });

      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(membership),
        update: vi.fn().mockResolvedValue(makeCircle({ id: circleId, inviteToken: null })),
      });

      await revokeCircleInviteToken({ circleId, userId }, { circleRepository: repo });

      expect(repo.update).toHaveBeenCalledWith(circleId, { inviteToken: null });
    });
  });

  describe("given user is not HOST", () => {
    it("should throw UnauthorizedCircleActionError when user is PLAYER", async () => {
      const circle = makeCircle({ id: circleId });
      const membership = makeMembership({ circleId, userId, role: "PLAYER" });

      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(membership),
      });

      await expect(
        revokeCircleInviteToken({ circleId, userId }, { circleRepository: repo })
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });

    it("should throw UnauthorizedCircleActionError when user has no membership", async () => {
      const circle = makeCircle({ id: circleId });

      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(null),
      });

      await expect(
        revokeCircleInviteToken({ circleId, userId }, { circleRepository: repo })
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });

  describe("given circle not found", () => {
    it("should throw CircleNotFoundError", async () => {
      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(null),
      });

      await expect(
        revokeCircleInviteToken({ circleId, userId }, { circleRepository: repo })
      ).rejects.toThrow(CircleNotFoundError);
    });
  });
});

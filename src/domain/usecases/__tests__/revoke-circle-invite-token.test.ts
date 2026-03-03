import { describe, it, expect, vi } from "vitest";
import { revokeCircleInviteToken } from "@/domain/usecases/revoke-circle-invite-token";
import { createMockCircleRepository, makeCircle, makeMembership } from "./helpers/mock-circle-repository";
import { CircleNotFoundError, UnauthorizedCircleActionError } from "@/domain/errors/circle-errors";

describe("RevokeCircleInviteToken", () => {
  const circleId = "circle-1";
  const userId = "user-1";

  describe("given user is HOST and circle has an existing token", () => {
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

    it("should resolve without returning a value", async () => {
      const circle = makeCircle({ id: circleId, inviteToken: "active-token" });
      const membership = makeMembership({ circleId, userId, role: "HOST" });

      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(membership),
        update: vi.fn().mockResolvedValue(makeCircle({ id: circleId, inviteToken: null })),
      });

      await expect(
        revokeCircleInviteToken({ circleId, userId }, { circleRepository: repo })
      ).resolves.toBeUndefined();
    });
  });

  describe("given user is HOST and no token exists (idempotent)", () => {
    it("should still call update with null without throwing", async () => {
      const circle = makeCircle({ id: circleId, inviteToken: null });
      const membership = makeMembership({ circleId, userId, role: "HOST" });

      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(membership),
        update: vi.fn().mockResolvedValue(makeCircle({ id: circleId, inviteToken: null })),
      });

      await expect(
        revokeCircleInviteToken({ circleId, userId }, { circleRepository: repo })
      ).resolves.toBeUndefined();

      expect(repo.update).toHaveBeenCalledWith(circleId, { inviteToken: null });
    });
  });

  describe("given user is not HOST", () => {
    it.each([
      ["PLAYER", makeMembership({ circleId: "circle-1", userId: "user-1", role: "PLAYER" })],
      ["non-membre", null],
    ])(
      "should throw UnauthorizedCircleActionError when user is %s",
      async (_label, membership) => {
        const circle = makeCircle({ id: circleId });

        const repo = createMockCircleRepository({
          findById: vi.fn().mockResolvedValue(circle),
          findMembership: vi.fn().mockResolvedValue(membership),
        });

        await expect(
          revokeCircleInviteToken({ circleId, userId }, { circleRepository: repo })
        ).rejects.toThrow(UnauthorizedCircleActionError);
      }
    );

    it("should not call update when user is not HOST", async () => {
      const circle = makeCircle({ id: circleId });
      const membership = makeMembership({ circleId, userId, role: "PLAYER" });

      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(membership),
        update: vi.fn(),
      });

      await expect(
        revokeCircleInviteToken({ circleId, userId }, { circleRepository: repo })
      ).rejects.toThrow(UnauthorizedCircleActionError);

      expect(repo.update).not.toHaveBeenCalled();
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

    it("should not check membership when circle does not exist", async () => {
      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(null),
        findMembership: vi.fn(),
      });

      await expect(
        revokeCircleInviteToken({ circleId, userId }, { circleRepository: repo })
      ).rejects.toThrow(CircleNotFoundError);

      expect(repo.findMembership).not.toHaveBeenCalled();
    });
  });
});

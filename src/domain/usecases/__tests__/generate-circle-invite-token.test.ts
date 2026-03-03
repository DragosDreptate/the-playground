import { describe, it, expect, vi } from "vitest";
import { generateCircleInviteToken } from "@/domain/usecases/generate-circle-invite-token";
import { createMockCircleRepository, makeCircle, makeMembership } from "./helpers/mock-circle-repository";
import { CircleNotFoundError, UnauthorizedCircleActionError } from "@/domain/errors/circle-errors";

describe("GenerateCircleInviteToken", () => {
  const circleId = "circle-1";
  const userId = "user-1";

  describe("given circle exists and user is HOST", () => {
    it("should generate a token and return it", async () => {
      const circle = makeCircle({ id: circleId, inviteToken: null });
      const membership = makeMembership({ circleId, userId, role: "HOST" });
      const updatedCircle = makeCircle({ id: circleId, inviteToken: "new-uuid-token" });

      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(membership),
        update: vi.fn().mockResolvedValue(updatedCircle),
      });

      const result = await generateCircleInviteToken({ circleId, userId }, { circleRepository: repo });

      expect(result.token).toBeTruthy();
      expect(typeof result.token).toBe("string");
      expect(repo.update).toHaveBeenCalledWith(circleId, expect.objectContaining({ inviteToken: expect.any(String) }));
    });
  });

  describe("given circle already has an invite token", () => {
    it("should return the existing token without updating", async () => {
      const existingToken = "existing-token-123";
      const circle = makeCircle({ id: circleId, inviteToken: existingToken });
      const membership = makeMembership({ circleId, userId, role: "HOST" });

      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(membership),
        update: vi.fn(),
      });

      const result = await generateCircleInviteToken({ circleId, userId }, { circleRepository: repo });

      expect(result.token).toBe(existingToken);
      expect(repo.update).not.toHaveBeenCalled();
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
        generateCircleInviteToken({ circleId, userId }, { circleRepository: repo })
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });

    it("should throw UnauthorizedCircleActionError when user has no membership", async () => {
      const circle = makeCircle({ id: circleId });

      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(null),
      });

      await expect(
        generateCircleInviteToken({ circleId, userId }, { circleRepository: repo })
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });

  describe("given circle not found", () => {
    it("should throw CircleNotFoundError", async () => {
      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(null),
      });

      await expect(
        generateCircleInviteToken({ circleId, userId }, { circleRepository: repo })
      ).rejects.toThrow(CircleNotFoundError);
    });
  });
});

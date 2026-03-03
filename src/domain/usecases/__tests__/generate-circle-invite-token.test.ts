import { describe, it, expect, vi } from "vitest";
import { generateCircleInviteToken } from "@/domain/usecases/generate-circle-invite-token";
import { createMockCircleRepository, makeCircle, makeMembership } from "./helpers/mock-circle-repository";
import { CircleNotFoundError, UnauthorizedCircleActionError } from "@/domain/errors/circle-errors";

describe("GenerateCircleInviteToken", () => {
  const circleId = "circle-1";
  const userId = "user-1";

  describe("given circle exists and user is HOST with no existing token", () => {
    it("should generate a UUID token and persist it", async () => {
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

    it("should generate a token that looks like a UUID", async () => {
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const generatedToken = crypto.randomUUID();
      const circle = makeCircle({ id: circleId, inviteToken: null });
      const membership = makeMembership({ circleId, userId, role: "HOST" });
      const updatedCircle = makeCircle({ id: circleId, inviteToken: generatedToken });

      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(membership),
        update: vi.fn().mockResolvedValue(updatedCircle),
      });

      const result = await generateCircleInviteToken({ circleId, userId }, { circleRepository: repo });

      expect(uuidPattern.test(result.token)).toBe(true);
    });

    it("should return the updated circle alongside the token", async () => {
      const circle = makeCircle({ id: circleId, inviteToken: null });
      const membership = makeMembership({ circleId, userId, role: "HOST" });
      const updatedCircle = makeCircle({ id: circleId, inviteToken: "some-token", name: "Updated Circle" });

      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(membership),
        update: vi.fn().mockResolvedValue(updatedCircle),
      });

      const result = await generateCircleInviteToken({ circleId, userId }, { circleRepository: repo });

      expect(result.circle.id).toBe(circleId);
      expect(result.circle.inviteToken).toBe("some-token");
    });
  });

  describe("given circle already has an invite token (idempotent)", () => {
    it("should return the existing token without calling update", async () => {
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

    it("should return the original circle (not an updated one) when token already exists", async () => {
      const existingToken = "already-set-token";
      const circle = makeCircle({ id: circleId, inviteToken: existingToken, name: "Original Name" });
      const membership = makeMembership({ circleId, userId, role: "HOST" });

      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(membership),
        update: vi.fn(),
      });

      const result = await generateCircleInviteToken({ circleId, userId }, { circleRepository: repo });

      expect(result.circle.name).toBe("Original Name");
      expect(result.circle.inviteToken).toBe(existingToken);
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
          generateCircleInviteToken({ circleId, userId }, { circleRepository: repo })
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
        generateCircleInviteToken({ circleId, userId }, { circleRepository: repo })
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
        generateCircleInviteToken({ circleId, userId }, { circleRepository: repo })
      ).rejects.toThrow(CircleNotFoundError);
    });

    it("should not check membership when circle does not exist", async () => {
      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(null),
        findMembership: vi.fn(),
      });

      await expect(
        generateCircleInviteToken({ circleId, userId }, { circleRepository: repo })
      ).rejects.toThrow(CircleNotFoundError);

      expect(repo.findMembership).not.toHaveBeenCalled();
    });
  });
});

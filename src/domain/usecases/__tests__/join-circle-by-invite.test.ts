import { describe, it, expect, vi } from "vitest";
import { joinCircleByInvite } from "@/domain/usecases/join-circle-by-invite";
import { createMockCircleRepository, makeCircle, makeMembership } from "./helpers/mock-circle-repository";
import { InvalidInviteTokenError } from "@/domain/errors/circle-errors";

describe("JoinCircleByInvite", () => {
  const token = "valid-token-123";
  const userId = "user-2";
  const circleId = "circle-1";

  describe("given valid token and user is not a member", () => {
    it("should add membership as PLAYER and return alreadyMember=false", async () => {
      const circle = makeCircle({ id: circleId, inviteToken: token });
      const membership = makeMembership({ circleId, userId, role: "PLAYER" });

      const repo = createMockCircleRepository({
        findByInviteToken: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(null),
        addMembership: vi.fn().mockResolvedValue(membership),
      });

      const result = await joinCircleByInvite({ token, userId }, { circleRepository: repo });

      expect(result.alreadyMember).toBe(false);
      expect(result.circle.id).toBe(circleId);
      expect(repo.addMembership).toHaveBeenCalledWith(circleId, userId, "PLAYER");
    });

    it("should return the circle data", async () => {
      const circle = makeCircle({ id: circleId, inviteToken: token, name: "Tech Circle" });

      const repo = createMockCircleRepository({
        findByInviteToken: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(null),
        addMembership: vi.fn().mockResolvedValue(makeMembership({ circleId, userId, role: "PLAYER" })),
      });

      const result = await joinCircleByInvite({ token, userId }, { circleRepository: repo });

      expect(result.circle.name).toBe("Tech Circle");
    });

    it("should look up the circle using the provided token", async () => {
      const circle = makeCircle({ id: circleId, inviteToken: token });

      const repo = createMockCircleRepository({
        findByInviteToken: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(null),
        addMembership: vi.fn().mockResolvedValue(makeMembership()),
      });

      await joinCircleByInvite({ token, userId }, { circleRepository: repo });

      expect(repo.findByInviteToken).toHaveBeenCalledWith(token);
    });
  });

  describe("given user is already a PLAYER member (idempotent)", () => {
    it("should return alreadyMember=true without adding membership", async () => {
      const circle = makeCircle({ id: circleId, inviteToken: token });
      const existingMembership = makeMembership({ circleId, userId, role: "PLAYER" });

      const repo = createMockCircleRepository({
        findByInviteToken: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(existingMembership),
        addMembership: vi.fn(),
      });

      const result = await joinCircleByInvite({ token, userId }, { circleRepository: repo });

      expect(result.alreadyMember).toBe(true);
      expect(repo.addMembership).not.toHaveBeenCalled();
    });
  });

  describe("given user is already a HOST member (idempotent)", () => {
    it("should return alreadyMember=true without adding a new membership", async () => {
      const circle = makeCircle({ id: circleId, inviteToken: token });
      // Le HOST est déjà membre — joinCircleByInvite ne doit pas écraser son rôle
      const existingMembership = makeMembership({ circleId, userId, role: "HOST" });

      const repo = createMockCircleRepository({
        findByInviteToken: vi.fn().mockResolvedValue(circle),
        findMembership: vi.fn().mockResolvedValue(existingMembership),
        addMembership: vi.fn(),
      });

      const result = await joinCircleByInvite({ token, userId }, { circleRepository: repo });

      expect(result.alreadyMember).toBe(true);
      expect(repo.addMembership).not.toHaveBeenCalled();
    });
  });

  describe("given invalid or revoked token", () => {
    it("should throw InvalidInviteTokenError when token is not found", async () => {
      const repo = createMockCircleRepository({
        findByInviteToken: vi.fn().mockResolvedValue(null),
      });

      await expect(
        joinCircleByInvite({ token: "bad-token", userId }, { circleRepository: repo })
      ).rejects.toThrow(InvalidInviteTokenError);
    });

    it("should not create a membership when token is invalid", async () => {
      const repo = createMockCircleRepository({
        findByInviteToken: vi.fn().mockResolvedValue(null),
        addMembership: vi.fn(),
      });

      await expect(
        joinCircleByInvite({ token: "revoked-token", userId }, { circleRepository: repo })
      ).rejects.toThrow(InvalidInviteTokenError);

      expect(repo.addMembership).not.toHaveBeenCalled();
    });
  });
});

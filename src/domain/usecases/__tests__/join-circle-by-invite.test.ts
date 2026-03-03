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
  });

  describe("given user is already a member", () => {
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

  describe("given invalid or revoked token", () => {
    it("should throw InvalidInviteTokenError", async () => {
      const repo = createMockCircleRepository({
        findByInviteToken: vi.fn().mockResolvedValue(null),
      });

      await expect(
        joinCircleByInvite({ token: "bad-token", userId }, { circleRepository: repo })
      ).rejects.toThrow(InvalidInviteTokenError);
    });
  });
});

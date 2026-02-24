import { describe, it, expect, vi } from "vitest";
import { unfollowCircle } from "@/domain/usecases/unfollow-circle";
import { NotFollowingCircleError } from "@/domain/errors";
import { createMockCircleRepository } from "./helpers/mock-circle-repository";

describe("UnfollowCircle", () => {
  describe("given a user who follows the circle", () => {
    it("should unfollow successfully", async () => {
      const repo = createMockCircleRepository({
        getFollowStatus: vi.fn().mockResolvedValue(true),
        unfollowCircle: vi.fn().mockResolvedValue(undefined),
      });

      await expect(
        unfollowCircle(
          { circleId: "circle-1", userId: "user-1" },
          { circleRepository: repo }
        )
      ).resolves.toBeUndefined();

      expect(repo.unfollowCircle).toHaveBeenCalledWith("user-1", "circle-1");
    });

    it("should check the follow status before unfollowing", async () => {
      const repo = createMockCircleRepository({
        getFollowStatus: vi.fn().mockResolvedValue(true),
        unfollowCircle: vi.fn().mockResolvedValue(undefined),
      });

      await unfollowCircle(
        { circleId: "circle-1", userId: "user-1" },
        { circleRepository: repo }
      );

      expect(repo.getFollowStatus).toHaveBeenCalledWith("user-1", "circle-1");
    });
  });

  describe("given a user who does not follow the circle", () => {
    it("should throw NotFollowingCircleError", async () => {
      const repo = createMockCircleRepository({
        getFollowStatus: vi.fn().mockResolvedValue(false),
      });

      await expect(
        unfollowCircle(
          { circleId: "circle-1", userId: "user-1" },
          { circleRepository: repo }
        )
      ).rejects.toThrow(NotFollowingCircleError);
    });

    it("should not call unfollowCircle if not following", async () => {
      const repo = createMockCircleRepository({
        getFollowStatus: vi.fn().mockResolvedValue(false),
      });

      await expect(
        unfollowCircle(
          { circleId: "circle-1", userId: "user-1" },
          { circleRepository: repo }
        )
      ).rejects.toThrow();

      expect(repo.unfollowCircle).not.toHaveBeenCalled();
    });
  });
});

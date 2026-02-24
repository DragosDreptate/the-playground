import { describe, it, expect, vi } from "vitest";
import { followCircle } from "@/domain/usecases/follow-circle";
import {
  CircleNotFoundError,
  AlreadyFollowingCircleError,
} from "@/domain/errors";
import {
  createMockCircleRepository,
  makeCircle,
  makeCircleFollow,
} from "./helpers/mock-circle-repository";

describe("FollowCircle", () => {
  describe("given a valid circle and a user who does not follow it yet", () => {
    it("should create a follow and return it", async () => {
      const circle = makeCircle({ id: "circle-1" });
      const follow = makeCircleFollow({ userId: "user-1", circleId: "circle-1" });

      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        getFollowStatus: vi.fn().mockResolvedValue(false),
        followCircle: vi.fn().mockResolvedValue(follow),
      });

      const result = await followCircle(
        { circleId: "circle-1", userId: "user-1" },
        { circleRepository: repo }
      );

      expect(repo.followCircle).toHaveBeenCalledWith("user-1", "circle-1");
      expect(result.follow).toEqual(follow);
    });

    it("should check that the circle exists before following", async () => {
      const circle = makeCircle();
      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        getFollowStatus: vi.fn().mockResolvedValue(false),
        followCircle: vi.fn().mockResolvedValue(makeCircleFollow()),
      });

      await followCircle(
        { circleId: "circle-1", userId: "user-1" },
        { circleRepository: repo }
      );

      expect(repo.findById).toHaveBeenCalledWith("circle-1");
    });
  });

  describe("given a circle that does not exist", () => {
    it("should throw CircleNotFoundError", async () => {
      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(null),
      });

      await expect(
        followCircle(
          { circleId: "nonexistent", userId: "user-1" },
          { circleRepository: repo }
        )
      ).rejects.toThrow(CircleNotFoundError);
    });

    it("should not call followCircle if the circle does not exist", async () => {
      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(null),
      });

      await expect(
        followCircle(
          { circleId: "nonexistent", userId: "user-1" },
          { circleRepository: repo }
        )
      ).rejects.toThrow();

      expect(repo.followCircle).not.toHaveBeenCalled();
    });
  });

  describe("given a user who already follows the circle", () => {
    it("should throw AlreadyFollowingCircleError", async () => {
      const circle = makeCircle();
      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        getFollowStatus: vi.fn().mockResolvedValue(true),
      });

      await expect(
        followCircle(
          { circleId: "circle-1", userId: "user-1" },
          { circleRepository: repo }
        )
      ).rejects.toThrow(AlreadyFollowingCircleError);
    });

    it("should not call followCircle if already following", async () => {
      const circle = makeCircle();
      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(circle),
        getFollowStatus: vi.fn().mockResolvedValue(true),
      });

      await expect(
        followCircle(
          { circleId: "circle-1", userId: "user-1" },
          { circleRepository: repo }
        )
      ).rejects.toThrow();

      expect(repo.followCircle).not.toHaveBeenCalled();
    });
  });
});

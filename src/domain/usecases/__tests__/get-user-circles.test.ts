import { describe, it, expect, vi } from "vitest";
import { getUserCircles } from "@/domain/usecases/get-user-circles";
import {
  createMockCircleRepository,
  makeCircle,
} from "./helpers/mock-circle-repository";

describe("GetUserCircles", () => {
  describe("given the user is HOST of some circles", () => {
    it("should return those circles", async () => {
      const circles = [
        makeCircle({ id: "c1", name: "Circle 1" }),
        makeCircle({ id: "c2", name: "Circle 2" }),
      ];
      const repo = createMockCircleRepository({
        findByUserId: vi.fn().mockResolvedValue(circles),
      });

      const result = await getUserCircles("user-1", {
        circleRepository: repo,
      });

      expect(result).toHaveLength(2);
      expect(repo.findByUserId).toHaveBeenCalledWith("user-1", "HOST");
    });
  });

  describe("given the user has no circles", () => {
    it("should return an empty array", async () => {
      const repo = createMockCircleRepository({
        findByUserId: vi.fn().mockResolvedValue([]),
      });

      const result = await getUserCircles("user-1", {
        circleRepository: repo,
      });

      expect(result).toEqual([]);
    });
  });
});

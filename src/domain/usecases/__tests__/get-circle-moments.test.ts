import { describe, it, expect, vi } from "vitest";
import { getCircleMoments } from "@/domain/usecases/get-circle-moments";
import { CircleNotFoundError } from "@/domain/errors";
import {
  createMockMomentRepository,
  makeMoment,
} from "./helpers/mock-moment-repository";
import {
  createMockCircleRepository,
  makeCircle,
} from "./helpers/mock-circle-repository";

describe("GetCircleMoments", () => {
  describe("given an existing Circle with Moments", () => {
    it("should return the list of Moments", async () => {
      const moments = [
        makeMoment({ id: "m1", title: "Meetup 1" }),
        makeMoment({ id: "m2", title: "Meetup 2" }),
      ];
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle()),
      });
      const momentRepo = createMockMomentRepository({
        findByCircleId: vi.fn().mockResolvedValue(moments),
      });

      const result = await getCircleMoments("circle-1", {
        momentRepository: momentRepo,
        circleRepository: circleRepo,
      });

      expect(result).toHaveLength(2);
      expect(momentRepo.findByCircleId).toHaveBeenCalledWith("circle-1");
    });
  });

  describe("given an existing Circle with no Moments", () => {
    it("should return an empty array", async () => {
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle()),
      });
      const momentRepo = createMockMomentRepository();

      const result = await getCircleMoments("circle-1", {
        momentRepository: momentRepo,
        circleRepository: circleRepo,
      });

      expect(result).toEqual([]);
    });
  });

  describe("given a non-existing Circle", () => {
    it("should throw CircleNotFoundError", async () => {
      const circleRepo = createMockCircleRepository();
      const momentRepo = createMockMomentRepository();

      await expect(
        getCircleMoments("unknown", {
          momentRepository: momentRepo,
          circleRepository: circleRepo,
        })
      ).rejects.toThrow(CircleNotFoundError);
    });
  });
});

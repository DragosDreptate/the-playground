import { describe, it, expect, vi } from "vitest";
import { deleteCircle } from "@/domain/usecases/delete-circle";
import {
  CircleNotFoundError,
  UnauthorizedCircleActionError,
} from "@/domain/errors";
import {
  createMockCircleRepository,
  makeCircle,
  makeMembership,
} from "./helpers/mock-circle-repository";

describe("DeleteCircle", () => {
  const defaultInput = {
    circleId: "circle-1",
    userId: "user-1",
  };

  describe("given the user is HOST of the circle", () => {
    it("should delete the circle", async () => {
      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle()),
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
        delete: vi.fn().mockResolvedValue(undefined),
      });

      await deleteCircle(defaultInput, { circleRepository: repo });

      expect(repo.delete).toHaveBeenCalledWith("circle-1");
    });
  });

  describe("given the circle does not exist", () => {
    it("should throw CircleNotFoundError", async () => {
      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(null),
      });

      await expect(
        deleteCircle(defaultInput, { circleRepository: repo })
      ).rejects.toThrow(CircleNotFoundError);
    });
  });

  describe("given the user is not HOST", () => {
    it("should throw UnauthorizedCircleActionError", async () => {
      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle()),
        findMembership: vi.fn().mockResolvedValue(null),
      });

      await expect(
        deleteCircle(defaultInput, { circleRepository: repo })
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });
});

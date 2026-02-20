import { describe, it, expect, vi } from "vitest";
import { updateCircle } from "@/domain/usecases/update-circle";
import {
  CircleNotFoundError,
  UnauthorizedCircleActionError,
} from "@/domain/errors";
import {
  createMockCircleRepository,
  makeCircle,
  makeMembership,
} from "./helpers/mock-circle-repository";

describe("UpdateCircle", () => {
  const defaultInput = {
    circleId: "circle-1",
    userId: "user-1",
    name: "Updated Name",
  };

  describe("given the user is HOST of the circle", () => {
    it("should update the circle", async () => {
      const updated = makeCircle({ name: "Updated Name" });
      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle()),
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
        update: vi.fn().mockResolvedValue(updated),
      });

      const result = await updateCircle(defaultInput, {
        circleRepository: repo,
      });

      expect(repo.update).toHaveBeenCalledWith("circle-1", {
        name: "Updated Name",
        description: undefined,
        visibility: undefined,
      });
      expect(result.circle.name).toBe("Updated Name");
    });
  });

  describe("given the circle does not exist", () => {
    it("should throw CircleNotFoundError", async () => {
      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(null),
      });

      await expect(
        updateCircle(defaultInput, { circleRepository: repo })
      ).rejects.toThrow(CircleNotFoundError);
    });
  });

  describe("given the user is not a member", () => {
    it("should throw UnauthorizedCircleActionError", async () => {
      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle()),
        findMembership: vi.fn().mockResolvedValue(null),
      });

      await expect(
        updateCircle(defaultInput, { circleRepository: repo })
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });

  describe("given the user is PLAYER (not HOST)", () => {
    it("should throw UnauthorizedCircleActionError", async () => {
      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle()),
        findMembership: vi
          .fn()
          .mockResolvedValue(makeMembership({ role: "PLAYER" })),
      });

      await expect(
        updateCircle(defaultInput, { circleRepository: repo })
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });
});

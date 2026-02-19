import { describe, it, expect, vi } from "vitest";
import { getCircleBySlug, getCircleById } from "@/domain/usecases/get-circle";
import { CircleNotFoundError } from "@/domain/errors";
import {
  createMockCircleRepository,
  makeCircle,
} from "./helpers/mock-circle-repository";

describe("GetCircle", () => {
  describe("getCircleBySlug", () => {
    describe("given a slug that exists", () => {
      it("should return the circle", async () => {
        const circle = makeCircle({ slug: "my-circle" });
        const repo = createMockCircleRepository({
          findBySlug: vi.fn().mockResolvedValue(circle),
        });

        const result = await getCircleBySlug("my-circle", {
          circleRepository: repo,
        });

        expect(result.slug).toBe("my-circle");
      });
    });

    describe("given a slug that does not exist", () => {
      it("should throw CircleNotFoundError", async () => {
        const repo = createMockCircleRepository({
          findBySlug: vi.fn().mockResolvedValue(null),
        });

        await expect(
          getCircleBySlug("non-existent", { circleRepository: repo })
        ).rejects.toThrow(CircleNotFoundError);
      });
    });
  });

  describe("getCircleById", () => {
    describe("given an id that exists", () => {
      it("should return the circle", async () => {
        const circle = makeCircle({ id: "circle-42" });
        const repo = createMockCircleRepository({
          findById: vi.fn().mockResolvedValue(circle),
        });

        const result = await getCircleById("circle-42", {
          circleRepository: repo,
        });

        expect(result.id).toBe("circle-42");
      });
    });

    describe("given an id that does not exist", () => {
      it("should throw CircleNotFoundError", async () => {
        const repo = createMockCircleRepository({
          findById: vi.fn().mockResolvedValue(null),
        });

        await expect(
          getCircleById("missing-id", { circleRepository: repo })
        ).rejects.toThrow(CircleNotFoundError);
      });
    });
  });
});

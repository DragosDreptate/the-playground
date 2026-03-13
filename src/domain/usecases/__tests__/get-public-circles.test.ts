import { describe, it, expect, vi } from "vitest";
import { getPublicCircles } from "@/domain/usecases/get-public-circles";
import { createMockCircleRepository } from "./helpers/mock-circle-repository";
import type { PublicCircle } from "@/domain/ports/repositories/circle-repository";

function makePublicCircle(overrides: Partial<PublicCircle> = {}): PublicCircle {
  return {
    id: "circle-1",
    slug: "tech-paris",
    name: "Tech Paris",
    description: "Tech community in Paris",
    category: "TECH",
    customCategory: null,
    city: "Paris",
    coverImage: null,
    coverImageAttribution: null,
    memberCount: 42,
    upcomingMomentCount: 3,
    nextMoment: { title: "Meetup React", startsAt: new Date("2026-03-15T18:00:00Z") },
    isDemo: false,
    explorerScore: 0,
    ...overrides,
  };
}

describe("getPublicCircles", () => {
  describe("given no filters", () => {
    it("should delegate to circleRepository.findPublic with empty filters", async () => {
      const mockCircle = makePublicCircle();
      const circleRepository = createMockCircleRepository({
        findPublic: vi.fn().mockResolvedValue([mockCircle]),
      });

      const result = await getPublicCircles({}, { circleRepository });

      expect(circleRepository.findPublic).toHaveBeenCalledWith({});
      expect(result).toEqual([mockCircle]);
    });
  });

  describe("given a category filter", () => {
    it("should pass the category filter to the repository", async () => {
      const circleRepository = createMockCircleRepository({
        findPublic: vi.fn().mockResolvedValue([]),
      });

      await getPublicCircles({ category: "TECH" }, { circleRepository });

      expect(circleRepository.findPublic).toHaveBeenCalledWith({ category: "TECH" });
    });
  });

  describe("given pagination params", () => {
    it("should pass limit and offset to the repository", async () => {
      const circleRepository = createMockCircleRepository({
        findPublic: vi.fn().mockResolvedValue([]),
      });

      await getPublicCircles({ limit: 10, offset: 5 }, { circleRepository });

      expect(circleRepository.findPublic).toHaveBeenCalledWith({ limit: 10, offset: 5 });
    });
  });

  describe("given multiple public circles", () => {
    it("should return all results from the repository", async () => {
      const circles = [
        makePublicCircle({ id: "circle-1", slug: "tech-paris", category: "TECH" }),
        makePublicCircle({ id: "circle-2", slug: "design-lyon", category: "DESIGN", city: "Lyon" }),
      ];
      const circleRepository = createMockCircleRepository({
        findPublic: vi.fn().mockResolvedValue(circles),
      });

      const result = await getPublicCircles({}, { circleRepository });

      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe("tech-paris");
      expect(result[1].slug).toBe("design-lyon");
    });
  });

  describe("given a sortBy filter", () => {
    it("should pass sortBy=date to the repository", async () => {
      const circleRepository = createMockCircleRepository({
        findPublic: vi.fn().mockResolvedValue([]),
      });

      await getPublicCircles({ sortBy: "date" }, { circleRepository });

      expect(circleRepository.findPublic).toHaveBeenCalledWith({ sortBy: "date" });
    });

    it("should pass sortBy=popular to the repository", async () => {
      const circleRepository = createMockCircleRepository({
        findPublic: vi.fn().mockResolvedValue([]),
      });

      await getPublicCircles({ sortBy: "popular" }, { circleRepository });

      expect(circleRepository.findPublic).toHaveBeenCalledWith({ sortBy: "popular" });
    });

    it("should pass sortBy=members to the repository", async () => {
      const circleRepository = createMockCircleRepository({
        findPublic: vi.fn().mockResolvedValue([]),
      });

      await getPublicCircles({ sortBy: "members" }, { circleRepository });

      expect(circleRepository.findPublic).toHaveBeenCalledWith({ sortBy: "members" });
    });

    it("should combine sortBy with category filter", async () => {
      const circleRepository = createMockCircleRepository({
        findPublic: vi.fn().mockResolvedValue([]),
      });

      await getPublicCircles({ category: "TECH", sortBy: "popular" }, { circleRepository });

      expect(circleRepository.findPublic).toHaveBeenCalledWith({ category: "TECH", sortBy: "popular" });
    });
  });

  describe("given no public circles", () => {
    it("should return an empty array", async () => {
      const circleRepository = createMockCircleRepository({
        findPublic: vi.fn().mockResolvedValue([]),
      });

      const result = await getPublicCircles({ category: "TECH" }, { circleRepository });

      expect(result).toEqual([]);
    });
  });
});

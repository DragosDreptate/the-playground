import { describe, it, expect, vi } from "vitest";
import { getFeaturedCircles } from "@/domain/usecases/get-featured-circles";
import { createMockCircleRepository } from "./helpers/mock-circle-repository";
import type { FeaturedCircle } from "@/domain/ports/repositories/circle-repository";

function makeFeaturedCircle(overrides: Partial<FeaturedCircle> = {}): FeaturedCircle {
  return {
    id: "circle-1",
    slug: "tech-paris",
    name: "Tech Paris",
    description: "Tech community in Paris",
    category: "TECH",
    customCategory: null,
    city: "Paris",
    coverImage: "https://example.com/cover.jpg",
    coverImageAttribution: null,
    memberCount: 42,
    upcomingMomentCount: 3,
    topMembers: [],
    ...overrides,
  };
}

describe("getFeaturedCircles", () => {
  describe("given circles in the featured pool", () => {
    it("should return featured circles from repository", async () => {
      const featured = [
        makeFeaturedCircle({ id: "circle-1", slug: "tech-paris" }),
        makeFeaturedCircle({ id: "circle-2", slug: "design-lyon", city: "Lyon" }),
        makeFeaturedCircle({ id: "circle-3", slug: "startup-bordeaux", city: "Bordeaux" }),
      ];
      const circleRepository = createMockCircleRepository({
        findFeatured: vi.fn().mockResolvedValue(featured),
      });

      const result = await getFeaturedCircles({ circleRepository });

      expect(circleRepository.findFeatured).toHaveBeenCalledOnce();
      expect(result).toEqual(featured);
      expect(result).toHaveLength(3);
    });
  });

  describe("given an empty featured pool", () => {
    it("should return empty array when pool is empty", async () => {
      const circleRepository = createMockCircleRepository({
        findFeatured: vi.fn().mockResolvedValue([]),
      });

      const result = await getFeaturedCircles({ circleRepository });

      expect(result).toEqual([]);
    });
  });

  describe("given fewer than 3 eligible circles", () => {
    it("should return fewer than 3 if pool has fewer than 3 eligible circles", async () => {
      const featured = [
        makeFeaturedCircle({ id: "circle-1", slug: "tech-paris" }),
        makeFeaturedCircle({ id: "circle-2", slug: "design-lyon", city: "Lyon" }),
      ];
      const circleRepository = createMockCircleRepository({
        findFeatured: vi.fn().mockResolvedValue(featured),
      });

      const result = await getFeaturedCircles({ circleRepository });

      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe("tech-paris");
      expect(result[1].slug).toBe("design-lyon");
    });
  });
});

import { describe, it, expect, vi } from "vitest";
import { getPublicUpcomingMoments } from "@/domain/usecases/get-public-upcoming-moments";
import { createMockMomentRepository } from "./helpers/mock-moment-repository";
import type { PublicMoment } from "@/domain/ports/repositories/moment-repository";

function makePublicMoment(overrides: Partial<PublicMoment> = {}): PublicMoment {
  return {
    id: "moment-1",
    slug: "meetup-react",
    title: "Meetup React",
    coverImage: null,
    startsAt: new Date("2026-03-15T18:00:00Z"),
    endsAt: new Date("2026-03-15T20:00:00Z"),
    locationType: "IN_PERSON",
    locationName: "Café Central",
    registrationCount: 12,
    capacity: 30,
    circle: {
      slug: "tech-paris",
      name: "Tech Paris",
      category: "TECH",
      city: "Paris",
    },
    ...overrides,
  };
}

describe("getPublicUpcomingMoments", () => {
  describe("given no filters", () => {
    it("should delegate to momentRepository.findPublicUpcoming with empty filters", async () => {
      const mockMoment = makePublicMoment();
      const momentRepository = createMockMomentRepository({
        findPublicUpcoming: vi.fn().mockResolvedValue([mockMoment]),
      });

      const result = await getPublicUpcomingMoments({}, { momentRepository });

      expect(momentRepository.findPublicUpcoming).toHaveBeenCalledWith({});
      expect(result).toEqual([mockMoment]);
    });
  });

  describe("given a category filter", () => {
    it("should pass the category filter to the repository", async () => {
      const momentRepository = createMockMomentRepository({
        findPublicUpcoming: vi.fn().mockResolvedValue([]),
      });

      await getPublicUpcomingMoments({ category: "DESIGN" }, { momentRepository });

      expect(momentRepository.findPublicUpcoming).toHaveBeenCalledWith({ category: "DESIGN" });
    });
  });

  describe("given pagination params", () => {
    it("should pass limit and offset to the repository", async () => {
      const momentRepository = createMockMomentRepository({
        findPublicUpcoming: vi.fn().mockResolvedValue([]),
      });

      await getPublicUpcomingMoments({ limit: 5, offset: 10 }, { momentRepository });

      expect(momentRepository.findPublicUpcoming).toHaveBeenCalledWith({ limit: 5, offset: 10 });
    });
  });

  describe("given multiple upcoming moments from public circles", () => {
    it("should return all results ordered by startsAt", async () => {
      const moments = [
        makePublicMoment({ id: "m-1", slug: "meetup-a", startsAt: new Date("2026-03-10T18:00:00Z") }),
        makePublicMoment({ id: "m-2", slug: "meetup-b", startsAt: new Date("2026-03-20T18:00:00Z") }),
      ];
      const momentRepository = createMockMomentRepository({
        findPublicUpcoming: vi.fn().mockResolvedValue(moments),
      });

      const result = await getPublicUpcomingMoments({}, { momentRepository });

      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe("meetup-a");
      expect(result[1].slug).toBe("meetup-b");
    });
  });

  describe("given an online moment", () => {
    it("should return moments with ONLINE locationType", async () => {
      const onlineMoment = makePublicMoment({
        locationType: "ONLINE",
        locationName: null,
      });
      const momentRepository = createMockMomentRepository({
        findPublicUpcoming: vi.fn().mockResolvedValue([onlineMoment]),
      });

      const result = await getPublicUpcomingMoments({}, { momentRepository });

      expect(result[0].locationType).toBe("ONLINE");
      expect(result[0].locationName).toBeNull();
    });
  });
});

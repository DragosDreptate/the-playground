import type { CircleVenue } from "@/domain/models/circle-venue";
import type { CircleVenueRepository } from "@/domain/ports/repositories/circle-venue-repository";
import { vi } from "vitest";

export function createMockCircleVenueRepository(
  overrides: Partial<CircleVenueRepository> = {}
): CircleVenueRepository {
  return {
    create: vi.fn<CircleVenueRepository["create"]>().mockResolvedValue(makeCircleVenue()),
    findById: vi.fn<CircleVenueRepository["findById"]>().mockResolvedValue(null),
    findByCircleId: vi.fn<CircleVenueRepository["findByCircleId"]>().mockResolvedValue([]),
    update: vi.fn<CircleVenueRepository["update"]>().mockResolvedValue(makeCircleVenue()),
    delete: vi.fn<CircleVenueRepository["delete"]>().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function makeCircleVenue(
  overrides: Partial<CircleVenue> = {}
): CircleVenue {
  return {
    id: "venue-1",
    circleId: "circle-1",
    name: "Cafe Central",
    address: "123 Main Street, Paris",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

import type { CircleNetworkRepository } from "@/domain/ports/repositories/circle-network-repository";
import type { CircleNetwork, CircleNetworkWithCircles } from "@/domain/models/circle-network";
import { vi } from "vitest";

export function createMockCircleNetworkRepository(
  overrides: Partial<CircleNetworkRepository> = {}
): CircleNetworkRepository {
  return {
    findBySlug: vi.fn<CircleNetworkRepository["findBySlug"]>().mockResolvedValue(null),
    findNetworksByCircleId: vi.fn<CircleNetworkRepository["findNetworksByCircleId"]>().mockResolvedValue([]),
    findAll: vi.fn<CircleNetworkRepository["findAll"]>().mockResolvedValue([]),
    findById: vi.fn<CircleNetworkRepository["findById"]>().mockResolvedValue(null),
    create: vi.fn<CircleNetworkRepository["create"]>().mockResolvedValue(makeNetwork()),
    update: vi.fn<CircleNetworkRepository["update"]>().mockResolvedValue(makeNetwork()),
    delete: vi.fn<CircleNetworkRepository["delete"]>().mockResolvedValue(undefined),
    addCircle: vi.fn<CircleNetworkRepository["addCircle"]>().mockResolvedValue(undefined),
    removeCircle: vi.fn<CircleNetworkRepository["removeCircle"]>().mockResolvedValue(undefined),
    searchCirclesNotInNetwork: vi.fn<CircleNetworkRepository["searchCirclesNotInNetwork"]>().mockResolvedValue([]),
    getCircleVisibilities: vi.fn<CircleNetworkRepository["getCircleVisibilities"]>().mockResolvedValue(new Map()),
    ...overrides,
  };
}

export function makeNetwork(overrides: Partial<CircleNetwork> = {}): CircleNetwork {
  return {
    id: "network-1",
    slug: "test-network",
    name: "Test Network",
    description: null,
    coverImage: null,
    coverImageAttribution: null,
    website: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

export function makeNetworkWithCircles(
  overrides: Partial<CircleNetworkWithCircles> = {}
): CircleNetworkWithCircles {
  return {
    ...makeNetwork(overrides),
    circles: [],
    ...overrides,
  };
}

import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { Circle, CircleMembership } from "@/domain/models/circle";
import { vi } from "vitest";

export function createMockCircleRepository(
  overrides: Partial<CircleRepository> = {}
): CircleRepository {
  return {
    create: vi.fn<CircleRepository["create"]>().mockResolvedValue(makeCircle()),
    findById: vi.fn<CircleRepository["findById"]>().mockResolvedValue(null),
    findBySlug: vi.fn<CircleRepository["findBySlug"]>().mockResolvedValue(null),
    findByUserId: vi.fn<CircleRepository["findByUserId"]>().mockResolvedValue([]),
    update: vi.fn<CircleRepository["update"]>().mockResolvedValue(makeCircle()),
    delete: vi.fn<CircleRepository["delete"]>().mockResolvedValue(undefined),
    slugExists: vi.fn<CircleRepository["slugExists"]>().mockResolvedValue(false),
    addMembership: vi.fn<CircleRepository["addMembership"]>().mockResolvedValue(makeMembership()),
    findAllByUserId: vi.fn<CircleRepository["findAllByUserId"]>().mockResolvedValue([]),
    findMembership: vi.fn<CircleRepository["findMembership"]>().mockResolvedValue(null),
    findMembersByRole: vi.fn<CircleRepository["findMembersByRole"]>().mockResolvedValue([]),
    countMembers: vi.fn<CircleRepository["countMembers"]>().mockResolvedValue(0),
    findPublic: vi.fn<CircleRepository["findPublic"]>().mockResolvedValue([]),
    ...overrides,
  };
}

export function makeCircle(overrides: Partial<Circle> = {}): Circle {
  return {
    id: "circle-1",
    slug: "my-circle",
    name: "My Circle",
    description: "A test circle",
    logo: null,
    visibility: "PUBLIC",
    category: null,
    city: null,
    stripeConnectAccountId: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

export function makeMembership(
  overrides: Partial<CircleMembership> = {}
): CircleMembership {
  return {
    id: "membership-1",
    userId: "user-1",
    circleId: "circle-1",
    role: "HOST",
    joinedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { Moment } from "@/domain/models/moment";
import { vi } from "vitest";

export function createMockMomentRepository(
  overrides: Partial<MomentRepository> = {}
): MomentRepository {
  return {
    create: vi.fn<MomentRepository["create"]>().mockResolvedValue(makeMoment()),
    findById: vi.fn<MomentRepository["findById"]>().mockResolvedValue(null),
    findBySlug: vi.fn<MomentRepository["findBySlug"]>().mockResolvedValue(null),
    findByCircleId: vi.fn<MomentRepository["findByCircleId"]>().mockResolvedValue([]),
    update: vi.fn<MomentRepository["update"]>().mockResolvedValue(makeMoment()),
    delete: vi.fn<MomentRepository["delete"]>().mockResolvedValue(undefined),
    slugExists: vi.fn<MomentRepository["slugExists"]>().mockResolvedValue(false),
    transitionPastMoments: vi.fn<MomentRepository["transitionPastMoments"]>().mockResolvedValue(0),
    findPublicUpcoming: vi.fn<MomentRepository["findPublicUpcoming"]>().mockResolvedValue([]),
    findUpcomingByCircleId: vi.fn<MomentRepository["findUpcomingByCircleId"]>().mockResolvedValue([]),
    findUpcomingByHostUserId: vi.fn<MomentRepository["findUpcomingByHostUserId"]>().mockResolvedValue([]),
    findPastByHostUserId: vi.fn<MomentRepository["findPastByHostUserId"]>().mockResolvedValue([]),
    ...overrides,
  };
}

export function makeMoment(overrides: Partial<Moment> = {}): Moment {
  return {
    id: "moment-1",
    slug: "weekly-meetup",
    circleId: "circle-1",
    createdById: "user-1",
    title: "Weekly Meetup",
    description: "A weekly community meetup",
    coverImage: null,
    coverImageAttribution: null,
    startsAt: new Date("2026-03-01T18:00:00Z"),
    endsAt: new Date("2026-03-01T20:00:00Z"),
    locationType: "IN_PERSON",
    locationName: "Cafe Central",
    locationAddress: "123 Main Street, Paris",
    videoLink: null,
    capacity: 30,
    price: 0,
    currency: "EUR",
    status: "PUBLISHED",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

import { vi } from "vitest";
import type {
  AdminRepository,
  AdminStats,
  AdminUserRow,
  AdminUserDetail,
  AdminCircleRow,
  AdminCircleDetail,
  AdminMomentRow,
  AdminMomentDetail,
} from "@/domain/ports/repositories/admin-repository";

export function createMockAdminRepository(
  overrides: Partial<AdminRepository> = {}
): AdminRepository {
  return {
    getStats: vi.fn().mockResolvedValue(makeAdminStats()),
    findAllUsers: vi.fn().mockResolvedValue([]),
    countUsers: vi.fn().mockResolvedValue(0),
    findUserById: vi.fn().mockResolvedValue(null),
    deleteUser: vi.fn().mockResolvedValue(undefined),
    findAllCircles: vi.fn().mockResolvedValue([]),
    countCircles: vi.fn().mockResolvedValue(0),
    findCircleById: vi.fn().mockResolvedValue(null),
    deleteCircle: vi.fn().mockResolvedValue(undefined),
    findAllMoments: vi.fn().mockResolvedValue([]),
    countMoments: vi.fn().mockResolvedValue(0),
    findMomentById: vi.fn().mockResolvedValue(null),
    deleteMoment: vi.fn().mockResolvedValue(undefined),
    updateMomentStatus: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function makeAdminStats(overrides: Partial<AdminStats> = {}): AdminStats {
  return {
    totalUsers: 42,
    totalCircles: 10,
    totalMoments: 25,
    totalRegistrations: 150,
    totalComments: 87,
    recentUsers: 5,
    recentCircles: 2,
    recentMoments: 4,
    recentComments: 12,
    ...overrides,
  };
}

export function makeAdminUserRow(overrides: Partial<AdminUserRow> = {}): AdminUserRow {
  return {
    id: "user-1",
    email: "alice@example.com",
    firstName: "Alice",
    lastName: "Martin",
    role: "USER",
    circleCount: 2,
    momentCount: 5,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

export function makeAdminUserDetail(
  overrides: Partial<AdminUserDetail> = {}
): AdminUserDetail {
  return {
    ...makeAdminUserRow(),
    name: "Alice Martin",
    image: null,
    onboardingCompleted: true,
    registrationCount: 10,
    circles: [
      { id: "circle-1", name: "Tech Paris", slug: "tech-paris", role: "HOST" },
    ],
    ...overrides,
  };
}

export function makeAdminCircleRow(
  overrides: Partial<AdminCircleRow> = {}
): AdminCircleRow {
  return {
    id: "circle-1",
    slug: "tech-paris",
    name: "Tech Paris",
    visibility: "PUBLIC",
    category: "TECH",
    city: "Paris",
    memberCount: 42,
    momentCount: 8,
    hostName: "Alice Martin",
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

export function makeAdminCircleDetail(
  overrides: Partial<AdminCircleDetail> = {}
): AdminCircleDetail {
  return {
    ...makeAdminCircleRow(),
    description: "A tech community in Paris",
    hosts: [
      {
        id: "user-1",
        email: "alice@example.com",
        firstName: "Alice",
        lastName: "Martin",
      },
    ],
    recentMoments: [
      {
        id: "moment-1",
        title: "Meetup React",
        slug: "meetup-react",
        status: "PUBLISHED",
        startsAt: new Date("2026-03-15T18:00:00Z"),
      },
    ],
    ...overrides,
  };
}

export function makeAdminMomentRow(
  overrides: Partial<AdminMomentRow> = {}
): AdminMomentRow {
  return {
    id: "moment-1",
    slug: "meetup-react",
    title: "Meetup React",
    status: "PUBLISHED",
    circleName: "Tech Paris",
    registrationCount: 12,
    capacity: 30,
    startsAt: new Date("2026-03-15T18:00:00Z"),
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

export function makeAdminMomentDetail(
  overrides: Partial<AdminMomentDetail> = {}
): AdminMomentDetail {
  return {
    ...makeAdminMomentRow(),
    description: "A React meetup",
    circleId: "circle-1",
    circleSlug: "tech-paris",
    createdByEmail: "alice@example.com",
    createdByName: "Alice Martin",
    registrations: [
      {
        id: "reg-1",
        userId: "user-2",
        userEmail: "bob@example.com",
        userName: "Bob Dupont",
        status: "REGISTERED",
        registeredAt: new Date("2026-02-01"),
      },
    ],
    ...overrides,
  };
}

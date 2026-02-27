import type { UserRepository } from "@/domain/ports/repositories/user-repository";
import type { User, NotificationPreferences } from "@/domain/models/user";
import { vi } from "vitest";

export function createMockUserRepository(
  overrides: Partial<UserRepository> = {}
): UserRepository {
  return {
    findById: vi.fn<UserRepository["findById"]>().mockResolvedValue(null),
    updateProfile: vi
      .fn<UserRepository["updateProfile"]>()
      .mockResolvedValue(makeUser()),
    delete: vi.fn<UserRepository["delete"]>().mockResolvedValue(undefined),
    getNotificationPreferences: vi
      .fn<UserRepository["getNotificationPreferences"]>()
      .mockResolvedValue(makeNotificationPreferences()),
    findNotificationPreferencesByIds: vi
      .fn<UserRepository["findNotificationPreferencesByIds"]>()
      .mockResolvedValue(new Map()),
    updateNotificationPreferences: vi
      .fn<UserRepository["updateNotificationPreferences"]>()
      .mockResolvedValue(makeNotificationPreferences()),
    updateDashboardMode: vi.fn<UserRepository["updateDashboardMode"]>().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "test@example.com",
    name: "Test User",
    firstName: "Test",
    lastName: "User",
    image: null,
    emailVerified: new Date("2026-01-01"),
    onboardingCompleted: false,
    role: "USER",
    notifyNewRegistration: true,
    notifyNewComment: true,
    notifyNewFollower: true,
    notifyNewMomentInCircle: true,
    dashboardMode: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

export function makeNotificationPreferences(
  overrides: Partial<NotificationPreferences> = {}
): NotificationPreferences {
  return {
    notifyNewRegistration: true,
    notifyNewComment: true,
    notifyNewFollower: true,
    notifyNewMomentInCircle: true,
    ...overrides,
  };
}

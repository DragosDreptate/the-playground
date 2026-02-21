import type { UserRepository } from "@/domain/ports/repositories/user-repository";
import type { User } from "@/domain/models/user";
import { vi } from "vitest";

export function createMockUserRepository(
  overrides: Partial<UserRepository> = {}
): UserRepository {
  return {
    findById: vi.fn<UserRepository["findById"]>().mockResolvedValue(null),
    updateProfile: vi
      .fn<UserRepository["updateProfile"]>()
      .mockResolvedValue(makeUser()),
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
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { Registration } from "@/domain/models/registration";
import { vi } from "vitest";

export function createMockRegistrationRepository(
  overrides: Partial<RegistrationRepository> = {}
): RegistrationRepository {
  return {
    create: vi.fn<RegistrationRepository["create"]>().mockResolvedValue(makeRegistration()),
    findById: vi.fn<RegistrationRepository["findById"]>().mockResolvedValue(null),
    findByMomentAndUser: vi.fn<RegistrationRepository["findByMomentAndUser"]>().mockResolvedValue(null),
    findActiveByMomentId: vi.fn<RegistrationRepository["findActiveByMomentId"]>().mockResolvedValue([]),
    findActiveWithUserByMomentId: vi.fn<RegistrationRepository["findActiveWithUserByMomentId"]>().mockResolvedValue([]),
    countByMomentIdAndStatus: vi.fn<RegistrationRepository["countByMomentIdAndStatus"]>().mockResolvedValue(0),
    findRegisteredCountsByMomentIds: vi.fn<RegistrationRepository["findRegisteredCountsByMomentIds"]>().mockResolvedValue(new Map()),
    findByMomentIdsAndUser: vi.fn<RegistrationRepository["findByMomentIdsAndUser"]>().mockResolvedValue(new Map()),
    update: vi.fn<RegistrationRepository["update"]>().mockResolvedValue(makeRegistration()),
    findUpcomingByUserId: vi.fn<RegistrationRepository["findUpcomingByUserId"]>().mockResolvedValue([]),
    findPastByUserId: vi.fn<RegistrationRepository["findPastByUserId"]>().mockResolvedValue([]),
    findFirstWaitlisted: vi.fn<RegistrationRepository["findFirstWaitlisted"]>().mockResolvedValue(null),
    countWaitlistPosition: vi.fn<RegistrationRepository["countWaitlistPosition"]>().mockResolvedValue(0),
    findFutureActiveByUserAndCircle: vi.fn<RegistrationRepository["findFutureActiveByUserAndCircle"]>().mockResolvedValue([]),
    ...overrides,
  };
}

export function makeRegistration(
  overrides: Partial<Registration> = {}
): Registration {
  return {
    id: "registration-1",
    momentId: "moment-1",
    userId: "user-2",
    status: "REGISTERED",
    paymentStatus: "NONE",
    stripePaymentIntentId: null,
    registeredAt: new Date("2026-02-15"),
    cancelledAt: null,
    checkedInAt: null,
    ...overrides,
  };
}

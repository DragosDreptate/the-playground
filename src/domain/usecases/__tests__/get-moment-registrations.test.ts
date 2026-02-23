import { describe, it, expect, vi } from "vitest";
import { getMomentRegistrations } from "@/domain/usecases/get-moment-registrations";
import {
  MomentNotFoundError,
  UnauthorizedMomentActionError,
} from "@/domain/errors";
import {
  createMockMomentRepository,
  makeMoment,
} from "./helpers/mock-moment-repository";
import {
  createMockCircleRepository,
  makeMembership,
} from "./helpers/mock-circle-repository";
import {
  createMockRegistrationRepository,
  makeRegistration,
} from "./helpers/mock-registration-repository";
import type { RegistrationWithUser } from "@/domain/models/registration";

function makeRegistrationWithUser(
  overrides: Partial<RegistrationWithUser> = {}
): RegistrationWithUser {
  return {
    ...makeRegistration(),
    user: {
      id: "user-2",
      firstName: "Alice",
      lastName: "Dupont",
      email: "alice@example.com",
      image: null,
    },
    ...overrides,
  };
}

describe("GetMomentRegistrations", () => {
  const defaultInput = {
    momentId: "moment-1",
    userId: "user-1",
  };

  describe("given a HOST requesting registrations", () => {
    it("should return registrations with counts", async () => {
      const registrations: RegistrationWithUser[] = [
        makeRegistrationWithUser({ id: "r1", status: "REGISTERED" }),
        makeRegistrationWithUser({ id: "r2", status: "REGISTERED" }),
        makeRegistrationWithUser({ id: "r3", status: "WAITLISTED" }),
      ];

      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment()),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
      });
      const registrationRepo = createMockRegistrationRepository({
        findActiveWithUserByMomentId: vi.fn().mockResolvedValue(registrations),
      });

      const result = await getMomentRegistrations(defaultInput, {
        momentRepository: momentRepo,
        circleRepository: circleRepo,
        registrationRepository: registrationRepo,
      });

      expect(result.registrations).toHaveLength(3);
      expect(result.registeredCount).toBe(2);
      expect(result.waitlistedCount).toBe(1);
    });
  });

  describe("given a PLAYER user (not HOST)", () => {
    it("should throw UnauthorizedMomentActionError", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment()),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "PLAYER" })),
      });
      const registrationRepo = createMockRegistrationRepository();

      await expect(
        getMomentRegistrations(defaultInput, {
          momentRepository: momentRepo,
          circleRepository: circleRepo,
          registrationRepository: registrationRepo,
        })
      ).rejects.toThrow(UnauthorizedMomentActionError);
    });
  });

  describe("given a non-member (no Circle membership)", () => {
    it("should throw UnauthorizedMomentActionError", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment()),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      });
      const registrationRepo = createMockRegistrationRepository();

      await expect(
        getMomentRegistrations(defaultInput, {
          momentRepository: momentRepo,
          circleRepository: circleRepo,
          registrationRepository: registrationRepo,
        })
      ).rejects.toThrow(UnauthorizedMomentActionError);
    });
  });

  describe("given a HOST with only CHECKED_IN registrations", () => {
    it("should return registrations with registeredCount=0 and waitlistedCount=0", async () => {
      const registrations: RegistrationWithUser[] = [
        makeRegistrationWithUser({ id: "r1", status: "CHECKED_IN" }),
      ];

      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment()),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
      });
      const registrationRepo = createMockRegistrationRepository({
        findActiveWithUserByMomentId: vi.fn().mockResolvedValue(registrations),
      });

      const result = await getMomentRegistrations(defaultInput, {
        momentRepository: momentRepo,
        circleRepository: circleRepo,
        registrationRepository: registrationRepo,
      });

      expect(result.registrations).toHaveLength(1);
      expect(result.registeredCount).toBe(0);
      expect(result.waitlistedCount).toBe(0);
    });
  });

  describe("given a non-existent Moment", () => {
    it("should throw MomentNotFoundError", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(null),
      });
      const circleRepo = createMockCircleRepository();
      const registrationRepo = createMockRegistrationRepository();

      await expect(
        getMomentRegistrations(defaultInput, {
          momentRepository: momentRepo,
          circleRepository: circleRepo,
          registrationRepository: registrationRepo,
        })
      ).rejects.toThrow(MomentNotFoundError);
    });
  });
});

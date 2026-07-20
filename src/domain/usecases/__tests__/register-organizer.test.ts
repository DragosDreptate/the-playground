import { describe, it, expect, vi } from "vitest";
import { registerOrganizer } from "@/domain/usecases/register-organizer";
import {
  MomentNotFoundError,
  MomentNotOpenForRegistrationError,
  UnauthorizedMomentActionError,
} from "@/domain/errors";
import {
  createMockRegistrationRepository,
  makeRegistration,
} from "./helpers/mock-registration-repository";
import {
  createMockMomentRepository,
  makeMoment,
} from "./helpers/mock-moment-repository";
import {
  createMockCircleRepository,
  makeMembership,
} from "./helpers/mock-circle-repository";

const ORGANIZER_ID = "organizer-1";
const MOMENT_ID = "moment-1";

// findOrganizers renvoie des CircleMemberWithUser : membre + bloc user.
function organizer(userId: string, role: "HOST" | "CO_HOST" = "CO_HOST") {
  return {
    ...makeMembership({ userId, role }),
    user: {
      id: userId,
      firstName: null,
      lastName: null,
      email: `${userId}@test.dev`,
      image: null,
      publicId: null,
    },
  };
}

function makeDeps(overrides: {
  registrationRepo?: ReturnType<typeof createMockRegistrationRepository>;
  momentRepo?: ReturnType<typeof createMockMomentRepository>;
  circleRepo?: ReturnType<typeof createMockCircleRepository>;
} = {}) {
  return {
    registrationRepository:
      overrides.registrationRepo ?? createMockRegistrationRepository(),
    momentRepository:
      overrides.momentRepo ??
      createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ id: MOMENT_ID, circleId: "circle-1", status: "PUBLISHED" })
        ),
      }),
    circleRepository:
      overrides.circleRepo ??
      createMockCircleRepository({
        findOrganizers: vi.fn().mockResolvedValue([organizer(ORGANIZER_ID)]),
      }),
  };
}

const input = { momentId: MOMENT_ID, userId: ORGANIZER_ID };

describe("registerOrganizer", () => {
  describe("given an organizer with no existing registration", () => {
    it("should create a REGISTERED registration", async () => {
      const registrationRepo = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(
          makeRegistration({ userId: ORGANIZER_ID, status: "REGISTERED" })
        ),
      });

      const result = await registerOrganizer(input, makeDeps({ registrationRepo }));

      expect(registrationRepo.create).toHaveBeenCalledWith({
        momentId: MOMENT_ID,
        userId: ORGANIZER_ID,
        status: "REGISTERED",
      });
      expect(result.registration.status).toBe("REGISTERED");
    });

    it("should bypass capacity (no waitlist for an organizer)", async () => {
      const registrationRepo = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(null),
      });
      // Événement complet (capacité 0) : l'organisateur passe quand même REGISTERED.
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ id: MOMENT_ID, circleId: "circle-1", status: "PUBLISHED", capacity: 0 })
        ),
      });

      await registerOrganizer(input, makeDeps({ registrationRepo, momentRepo }));

      expect(registrationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: "REGISTERED" })
      );
      expect(registrationRepo.countByMomentIdAndStatus).not.toHaveBeenCalled();
    });
  });

  describe("given the organizer is already REGISTERED / CHECKED_IN", () => {
    it.each(["REGISTERED", "CHECKED_IN"] as const)(
      "should be idempotent for %s (no create/update)",
      async (status) => {
        const existing = makeRegistration({ id: "reg-x", userId: ORGANIZER_ID, status });
        const registrationRepo = createMockRegistrationRepository({
          findByMomentAndUser: vi.fn().mockResolvedValue(existing),
        });

        const result = await registerOrganizer(input, makeDeps({ registrationRepo }));

        expect(result.registration).toBe(existing);
        expect(registrationRepo.create).not.toHaveBeenCalled();
        expect(registrationRepo.update).not.toHaveBeenCalled();
      }
    );
  });

  describe("given a non-confirmed existing registration", () => {
    it.each(["CANCELLED", "REJECTED", "WAITLISTED", "PENDING_APPROVAL"] as const)(
      "should force a %s registration back to REGISTERED",
      async (status) => {
        const existing = makeRegistration({ id: "reg-x", userId: ORGANIZER_ID, status });
        const registrationRepo = createMockRegistrationRepository({
          findByMomentAndUser: vi.fn().mockResolvedValue(existing),
          update: vi.fn().mockResolvedValue(
            makeRegistration({ id: "reg-x", userId: ORGANIZER_ID, status: "REGISTERED" })
          ),
        });

        const result = await registerOrganizer(input, makeDeps({ registrationRepo }));

        expect(registrationRepo.update).toHaveBeenCalledWith("reg-x", {
          status: "REGISTERED",
          cancelledAt: null,
        });
        expect(registrationRepo.create).not.toHaveBeenCalled();
        expect(result.registration.status).toBe("REGISTERED");
      }
    );
  });

  describe("given the user is not a real organizer of the Circle", () => {
    it("should throw UnauthorizedMomentActionError (admin host mode / non-member)", async () => {
      const circleRepo = createMockCircleRepository({
        // Le user ne figure pas dans findOrganizers (membres persistés).
        findOrganizers: vi.fn().mockResolvedValue([organizer("someone-else")]),
      });

      await expect(
        registerOrganizer(input, makeDeps({ circleRepo }))
      ).rejects.toThrow(UnauthorizedMomentActionError);
    });
  });

  describe("given the moment does not exist", () => {
    it("should throw MomentNotFoundError", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(null),
      });

      await expect(
        registerOrganizer(input, makeDeps({ momentRepo }))
      ).rejects.toThrow(MomentNotFoundError);
    });
  });

  describe("given the moment is no longer open", () => {
    it.each(["PAST", "CANCELLED"] as const)(
      "should throw MomentNotOpenForRegistrationError for a %s event",
      async (status) => {
        const momentRepo = createMockMomentRepository({
          findById: vi.fn().mockResolvedValue(
            makeMoment({ id: MOMENT_ID, circleId: "circle-1", status })
          ),
        });

        await expect(
          registerOrganizer(input, makeDeps({ momentRepo }))
        ).rejects.toThrow(MomentNotOpenForRegistrationError);
      }
    );
  });
});

/**
 * Tests d'enchaînements complexes du cycle de vie des inscriptions.
 * Couvre les scénarios multi-étapes croisant joinMoment et cancelRegistration.
 */
import { describe, it, expect, vi } from "vitest";
import { joinMoment } from "@/domain/usecases/join-moment";
import { cancelRegistration } from "@/domain/usecases/cancel-registration";
import {
  MomentAlreadyStartedError,
  MomentNotOpenForRegistrationError,
  AlreadyRegisteredError,
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

describe("Registration Lifecycle", () => {
  describe("Register → Cancel → Re-register (full cycle)", () => {
    it("should update existing row instead of creating a new one", async () => {
      // Step 1: Initial registration
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "PUBLISHED", capacity: 30, price: 0 })
        ),
      });

      const createdReg = makeRegistration({
        id: "reg-1",
        status: "REGISTERED",
        cancelledAt: null,
      });

      const joinRegistrationRepo = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(null),
        countByMomentIdAndStatus: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue(createdReg),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      });

      const step1 = await joinMoment(
        { momentId: "moment-1", userId: "user-2" },
        {
          momentRepository: momentRepo,
          registrationRepository: joinRegistrationRepo,
          circleRepository: circleRepo,
        }
      );
      expect(step1.registration.status).toBe("REGISTERED");
      expect(joinRegistrationRepo.create).toHaveBeenCalledTimes(1);

      // Step 2: Cancel
      const cancelRegistrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(createdReg),
        update: vi.fn().mockResolvedValue(
          makeRegistration({ id: "reg-1", status: "CANCELLED", cancelledAt: new Date() })
        ),
        findFirstWaitlisted: vi.fn().mockResolvedValue(null),
      });

      const step2 = await cancelRegistration(
        { registrationId: "reg-1", userId: "user-2" },
        {
          registrationRepository: cancelRegistrationRepo,
          momentRepository: momentRepo,
          circleRepository: createMockCircleRepository({
            findMembership: vi.fn().mockResolvedValue(
              makeMembership({ role: "PLAYER" })
            ),
          }),
        }
      );
      expect(step2.registration.status).toBe("CANCELLED");

      // Step 3: Re-register — should UPDATE, not CREATE
      const cancelledReg = makeRegistration({
        id: "reg-1",
        status: "CANCELLED",
        cancelledAt: new Date(),
      });
      const reactivatedReg = makeRegistration({
        id: "reg-1",
        status: "REGISTERED",
        cancelledAt: null,
      });

      const rejoinRegistrationRepo = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(cancelledReg),
        countByMomentIdAndStatus: vi.fn().mockResolvedValue(1),
        update: vi.fn().mockResolvedValue(reactivatedReg),
      });
      const rejoinCircleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(
          makeMembership({ role: "PLAYER" })
        ),
      });

      const step3 = await joinMoment(
        { momentId: "moment-1", userId: "user-2" },
        {
          momentRepository: momentRepo,
          registrationRepository: rejoinRegistrationRepo,
          circleRepository: rejoinCircleRepo,
        }
      );

      expect(step3.registration.status).toBe("REGISTERED");
      expect(rejoinRegistrationRepo.update).toHaveBeenCalledWith("reg-1", {
        status: "REGISTERED",
        cancelledAt: null,
      });
      expect(rejoinRegistrationRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("Register → Cancel → Re-register when Moment became full", () => {
    it("should re-register as WAITLISTED", async () => {
      const cancelledReg = makeRegistration({
        id: "reg-1",
        status: "CANCELLED",
        cancelledAt: new Date(),
      });

      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "PUBLISHED", capacity: 5, price: 0 })
        ),
      });
      const registrationRepo = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(cancelledReg),
        countByMomentIdAndStatus: vi.fn().mockResolvedValue(5), // full
        update: vi.fn().mockResolvedValue(
          makeRegistration({ id: "reg-1", status: "WAITLISTED", cancelledAt: null })
        ),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(
          makeMembership({ role: "PLAYER" })
        ),
      });

      const result = await joinMoment(
        { momentId: "moment-1", userId: "user-2" },
        {
          momentRepository: momentRepo,
          registrationRepository: registrationRepo,
          circleRepository: circleRepo,
        }
      );

      expect(result.registration.status).toBe("WAITLISTED");
      expect(registrationRepo.update).toHaveBeenCalledWith("reg-1", {
        status: "WAITLISTED",
        cancelledAt: null,
      });
    });
  });

  describe("Register → Cancel → Moment starts → try to re-register", () => {
    it("should throw MomentAlreadyStartedError", async () => {
      const pastStart = new Date(Date.now() - 60 * 1000); // 1 min ago
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "PUBLISHED", startsAt: pastStart, price: 0 })
        ),
      });
      const registrationRepo = createMockRegistrationRepository();
      const circleRepo = createMockCircleRepository();

      await expect(
        joinMoment(
          { momentId: "moment-1", userId: "user-2" },
          {
            momentRepository: momentRepo,
            registrationRepository: registrationRepo,
            circleRepository: circleRepo,
          }
        )
      ).rejects.toThrow(MomentAlreadyStartedError);
    });
  });

  describe("Register → Cancel → Moment gets CANCELLED → try to re-register", () => {
    it("should throw MomentNotOpenForRegistrationError", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "CANCELLED", price: 0 })
        ),
      });
      const registrationRepo = createMockRegistrationRepository();
      const circleRepo = createMockCircleRepository();

      await expect(
        joinMoment(
          { momentId: "moment-1", userId: "user-2" },
          {
            momentRepository: momentRepo,
            registrationRepository: registrationRepo,
            circleRepository: circleRepo,
          }
        )
      ).rejects.toThrow(MomentNotOpenForRegistrationError);
    });
  });

  describe("Cancel frees spot → waitlisted promoted → another Player registers", () => {
    it("should register the new Player normally (spot was taken by promoted user)", async () => {
      // After cancellation + promotion, the count is still at capacity
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "PUBLISHED", capacity: 2, price: 0 })
        ),
      });

      // New player tries to register — Moment is at capacity (promoted user took the spot)
      const registrationRepo = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(null),
        countByMomentIdAndStatus: vi.fn().mockResolvedValue(2), // full after promotion
        create: vi.fn().mockResolvedValue(
          makeRegistration({ id: "reg-new", userId: "user-4", status: "WAITLISTED" })
        ),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      });

      const result = await joinMoment(
        { momentId: "moment-1", userId: "user-4" },
        {
          momentRepository: momentRepo,
          registrationRepository: registrationRepo,
          circleRepository: circleRepo,
        }
      );

      expect(result.registration.status).toBe("WAITLISTED");
    });
  });

  describe("Register → Cancel → Re-register → Cancel again (double cycle)", () => {
    it("should handle the second cancel identically to the first", async () => {
      // The re-activated registration (after first cancel + re-register)
      const reactivatedReg = makeRegistration({
        id: "reg-1",
        status: "REGISTERED",
        cancelledAt: null,
      });

      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ circleId: "circle-1" })
        ),
      });
      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(reactivatedReg),
        update: vi.fn().mockResolvedValue(
          makeRegistration({ id: "reg-1", status: "CANCELLED", cancelledAt: new Date() })
        ),
        findFirstWaitlisted: vi.fn().mockResolvedValue(null),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(
          makeMembership({ role: "PLAYER" })
        ),
      });

      const result = await cancelRegistration(
        { registrationId: "reg-1", userId: "user-2" },
        {
          registrationRepository: registrationRepo,
          momentRepository: momentRepo,
          circleRepository: circleRepo,
        }
      );

      expect(result.registration.status).toBe("CANCELLED");
      expect(registrationRepo.update).toHaveBeenCalledWith("reg-1", {
        status: "CANCELLED",
        cancelledAt: expect.any(Date),
      });
    });
  });

  describe("Capacity boundary: exactly at limit", () => {
    it("should REGISTER when count is capacity - 1", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "PUBLISHED", capacity: 10, price: 0 })
        ),
      });
      const registrationRepo = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(null),
        countByMomentIdAndStatus: vi.fn().mockResolvedValue(9), // one spot left
        create: vi.fn().mockResolvedValue(
          makeRegistration({ status: "REGISTERED" })
        ),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      });

      const result = await joinMoment(
        { momentId: "moment-1", userId: "user-2" },
        {
          momentRepository: momentRepo,
          registrationRepository: registrationRepo,
          circleRepository: circleRepo,
        }
      );

      expect(registrationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: "REGISTERED" })
      );
      expect(result.registration.status).toBe("REGISTERED");
    });

    it("should WAITLIST when count equals capacity exactly", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "PUBLISHED", capacity: 10, price: 0 })
        ),
      });
      const registrationRepo = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(null),
        countByMomentIdAndStatus: vi.fn().mockResolvedValue(10), // exactly full
        create: vi.fn().mockResolvedValue(
          makeRegistration({ status: "WAITLISTED" })
        ),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      });

      const result = await joinMoment(
        { momentId: "moment-1", userId: "user-2" },
        {
          momentRepository: momentRepo,
          registrationRepository: registrationRepo,
          circleRepository: circleRepo,
        }
      );

      expect(registrationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: "WAITLISTED" })
      );
      expect(result.registration.status).toBe("WAITLISTED");
    });
  });
});

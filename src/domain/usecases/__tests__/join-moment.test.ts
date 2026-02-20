import { describe, it, expect, vi } from "vitest";
import { joinMoment } from "@/domain/usecases/join-moment";
import {
  MomentNotFoundError,
  MomentNotOpenForRegistrationError,
  MomentAlreadyStartedError,
  PaidMomentNotSupportedError,
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

describe("JoinMoment", () => {
  const defaultInput = {
    momentId: "moment-1",
    userId: "user-2",
  };

  describe("given a PUBLISHED free Moment with available capacity", () => {
    it("should create a REGISTERED registration", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "PUBLISHED", capacity: 30, price: 0 })
        ),
      });
      const registrationRepo = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(null),
        countByMomentIdAndStatus: vi.fn().mockResolvedValue(5),
        create: vi.fn().mockResolvedValue(
          makeRegistration({ status: "REGISTERED" })
        ),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      });

      const result = await joinMoment(defaultInput, {
        momentRepository: momentRepo,
        registrationRepository: registrationRepo,
        circleRepository: circleRepo,
      });

      expect(registrationRepo.create).toHaveBeenCalledWith({
        momentId: "moment-1",
        userId: "user-2",
        status: "REGISTERED",
      });
      expect(result.registration.status).toBe("REGISTERED");
    });

    it("should auto-join the user to the Circle as PLAYER", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "PUBLISHED", circleId: "circle-1", price: 0 })
        ),
      });
      const registrationRepo = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(null),
        countByMomentIdAndStatus: vi.fn().mockResolvedValue(0),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      });

      await joinMoment(defaultInput, {
        momentRepository: momentRepo,
        registrationRepository: registrationRepo,
        circleRepository: circleRepo,
      });

      expect(circleRepo.addMembership).toHaveBeenCalledWith(
        "circle-1",
        "user-2",
        "PLAYER"
      );
    });
  });

  describe("given unlimited capacity (null)", () => {
    it("should create a REGISTERED registration", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "PUBLISHED", capacity: null, price: 0 })
        ),
      });
      const registrationRepo = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(null),
        countByMomentIdAndStatus: vi.fn().mockResolvedValue(999),
        create: vi.fn().mockResolvedValue(
          makeRegistration({ status: "REGISTERED" })
        ),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      });

      const result = await joinMoment(defaultInput, {
        momentRepository: momentRepo,
        registrationRepository: registrationRepo,
        circleRepository: circleRepo,
      });

      expect(registrationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: "REGISTERED" })
      );
      expect(result.registration.status).toBe("REGISTERED");
    });
  });

  describe("given a Moment at full capacity", () => {
    it("should create a WAITLISTED registration", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "PUBLISHED", capacity: 10, price: 0 })
        ),
      });
      const registrationRepo = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(null),
        countByMomentIdAndStatus: vi.fn().mockResolvedValue(10),
        create: vi.fn().mockResolvedValue(
          makeRegistration({ status: "WAITLISTED" })
        ),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      });

      const result = await joinMoment(defaultInput, {
        momentRepository: momentRepo,
        registrationRepository: registrationRepo,
        circleRepository: circleRepo,
      });

      expect(registrationRepo.create).toHaveBeenCalledWith({
        momentId: "moment-1",
        userId: "user-2",
        status: "WAITLISTED",
      });
      expect(result.registration.status).toBe("WAITLISTED");
    });
  });

  describe("given a Moment that is not PUBLISHED", () => {
    it.each(["CANCELLED", "PAST"] as const)(
      "should throw MomentNotOpenForRegistrationError for %s status",
      async (status) => {
        const momentRepo = createMockMomentRepository({
          findById: vi.fn().mockResolvedValue(
            makeMoment({ status, price: 0 })
          ),
        });
        const registrationRepo = createMockRegistrationRepository();
        const circleRepo = createMockCircleRepository();

        await expect(
          joinMoment(defaultInput, {
            momentRepository: momentRepo,
            registrationRepository: registrationRepo,
            circleRepository: circleRepo,
          })
        ).rejects.toThrow(MomentNotOpenForRegistrationError);
      }
    );
  });

  describe("given a Moment that has already started", () => {
    it("should throw MomentAlreadyStartedError", async () => {
      const pastStart = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "PUBLISHED", startsAt: pastStart, price: 0 })
        ),
      });
      const registrationRepo = createMockRegistrationRepository();
      const circleRepo = createMockCircleRepository();

      await expect(
        joinMoment(defaultInput, {
          momentRepository: momentRepo,
          registrationRepository: registrationRepo,
          circleRepository: circleRepo,
        })
      ).rejects.toThrow(MomentAlreadyStartedError);
    });
  });

  describe("given a paid Moment", () => {
    it("should throw PaidMomentNotSupportedError", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "PUBLISHED", price: 1500 })
        ),
      });
      const registrationRepo = createMockRegistrationRepository();
      const circleRepo = createMockCircleRepository();

      await expect(
        joinMoment(defaultInput, {
          momentRepository: momentRepo,
          registrationRepository: registrationRepo,
          circleRepository: circleRepo,
        })
      ).rejects.toThrow(PaidMomentNotSupportedError);
    });
  });

  describe("given a user already registered", () => {
    it("should throw AlreadyRegisteredError for REGISTERED status", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "PUBLISHED", price: 0 })
        ),
      });
      const registrationRepo = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(
          makeRegistration({ status: "REGISTERED" })
        ),
      });
      const circleRepo = createMockCircleRepository();

      await expect(
        joinMoment(defaultInput, {
          momentRepository: momentRepo,
          registrationRepository: registrationRepo,
          circleRepository: circleRepo,
        })
      ).rejects.toThrow(AlreadyRegisteredError);
    });

    it("should throw AlreadyRegisteredError for WAITLISTED status", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "PUBLISHED", price: 0 })
        ),
      });
      const registrationRepo = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(
          makeRegistration({ status: "WAITLISTED" })
        ),
      });
      const circleRepo = createMockCircleRepository();

      await expect(
        joinMoment(defaultInput, {
          momentRepository: momentRepo,
          registrationRepository: registrationRepo,
          circleRepository: circleRepo,
        })
      ).rejects.toThrow(AlreadyRegisteredError);
    });

    it("should throw AlreadyRegisteredError for CHECKED_IN status", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "PUBLISHED", price: 0 })
        ),
      });
      const registrationRepo = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(
          makeRegistration({ status: "CHECKED_IN" })
        ),
      });
      const circleRepo = createMockCircleRepository();

      await expect(
        joinMoment(defaultInput, {
          momentRepository: momentRepo,
          registrationRepository: registrationRepo,
          circleRepository: circleRepo,
        })
      ).rejects.toThrow(AlreadyRegisteredError);
    });
  });

  describe("given a user who previously cancelled", () => {
    it("should re-activate via update (not create) with cancelledAt cleared", async () => {
      const cancelledReg = makeRegistration({
        id: "reg-existing",
        status: "CANCELLED",
        cancelledAt: new Date("2026-02-10"),
      });
      const reactivatedReg = makeRegistration({
        id: "reg-existing",
        status: "REGISTERED",
        cancelledAt: null,
      });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "PUBLISHED", capacity: 30, price: 0 })
        ),
      });
      const registrationRepo = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(cancelledReg),
        countByMomentIdAndStatus: vi.fn().mockResolvedValue(5),
        update: vi.fn().mockResolvedValue(reactivatedReg),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "PLAYER" })),
      });

      const result = await joinMoment(defaultInput, {
        momentRepository: momentRepo,
        registrationRepository: registrationRepo,
        circleRepository: circleRepo,
      });

      expect(registrationRepo.update).toHaveBeenCalledWith("reg-existing", {
        status: "REGISTERED",
        cancelledAt: null,
      });
      expect(registrationRepo.create).not.toHaveBeenCalled();
      expect(result.registration.status).toBe("REGISTERED");
      expect(result.registration.cancelledAt).toBeNull();
    });

    it("should re-activate as WAITLISTED when Moment is now full", async () => {
      const cancelledReg = makeRegistration({
        id: "reg-existing",
        status: "CANCELLED",
        cancelledAt: new Date("2026-02-10"),
      });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "PUBLISHED", capacity: 10, price: 0 })
        ),
      });
      const registrationRepo = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(cancelledReg),
        countByMomentIdAndStatus: vi.fn().mockResolvedValue(10),
        update: vi.fn().mockResolvedValue(
          makeRegistration({ id: "reg-existing", status: "WAITLISTED", cancelledAt: null })
        ),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "PLAYER" })),
      });

      const result = await joinMoment(defaultInput, {
        momentRepository: momentRepo,
        registrationRepository: registrationRepo,
        circleRepository: circleRepo,
      });

      expect(registrationRepo.update).toHaveBeenCalledWith("reg-existing", {
        status: "WAITLISTED",
        cancelledAt: null,
      });
      expect(result.registration.status).toBe("WAITLISTED");
    });

    it("should not re-add Circle membership if already a member", async () => {
      const cancelledReg = makeRegistration({
        id: "reg-existing",
        status: "CANCELLED",
      });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "PUBLISHED", capacity: 30, price: 0 })
        ),
      });
      const registrationRepo = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(cancelledReg),
        countByMomentIdAndStatus: vi.fn().mockResolvedValue(5),
        update: vi.fn().mockResolvedValue(
          makeRegistration({ status: "REGISTERED" })
        ),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "PLAYER" })),
      });

      await joinMoment(defaultInput, {
        momentRepository: momentRepo,
        registrationRepository: registrationRepo,
        circleRepository: circleRepo,
      });

      expect(circleRepo.addMembership).not.toHaveBeenCalled();
    });
  });

  describe("given a user who cancelled but Moment status changed meanwhile", () => {
    it("should throw MomentNotOpenForRegistrationError if Moment was CANCELLED", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "CANCELLED", price: 0 })
        ),
      });
      const registrationRepo = createMockRegistrationRepository();
      const circleRepo = createMockCircleRepository();

      await expect(
        joinMoment(defaultInput, {
          momentRepository: momentRepo,
          registrationRepository: registrationRepo,
          circleRepository: circleRepo,
        })
      ).rejects.toThrow(MomentNotOpenForRegistrationError);
    });

    it("should throw MomentAlreadyStartedError if Moment has started since cancellation", async () => {
      const pastStart = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "PUBLISHED", startsAt: pastStart, price: 0 })
        ),
      });
      const registrationRepo = createMockRegistrationRepository();
      const circleRepo = createMockCircleRepository();

      await expect(
        joinMoment(defaultInput, {
          momentRepository: momentRepo,
          registrationRepository: registrationRepo,
          circleRepository: circleRepo,
        })
      ).rejects.toThrow(MomentAlreadyStartedError);
    });
  });

  describe("given the user is already a Circle member", () => {
    it("should not call addMembership", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "PUBLISHED", price: 0 })
        ),
      });
      const registrationRepo = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(null),
        countByMomentIdAndStatus: vi.fn().mockResolvedValue(0),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(
          makeMembership({ role: "PLAYER" })
        ),
      });

      await joinMoment(defaultInput, {
        momentRepository: momentRepo,
        registrationRepository: registrationRepo,
        circleRepository: circleRepo,
      });

      expect(circleRepo.addMembership).not.toHaveBeenCalled();
    });
  });

  describe("given a non-existent Moment", () => {
    it("should throw MomentNotFoundError", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(null),
      });
      const registrationRepo = createMockRegistrationRepository();
      const circleRepo = createMockCircleRepository();

      await expect(
        joinMoment(defaultInput, {
          momentRepository: momentRepo,
          registrationRepository: registrationRepo,
          circleRepository: circleRepo,
        })
      ).rejects.toThrow(MomentNotFoundError);
    });
  });
});

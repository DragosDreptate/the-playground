import { describe, it, expect, vi } from "vitest";
import { joinMoment } from "@/domain/usecases/join-moment";
import {
  MomentNotFoundError,
  MomentNotOpenForRegistrationError,
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
    it("should throw AlreadyRegisteredError", async () => {
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
  });

  describe("given a user who previously cancelled", () => {
    it("should allow re-registration", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(
          makeMoment({ status: "PUBLISHED", capacity: 30, price: 0 })
        ),
      });
      const registrationRepo = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(
          makeRegistration({ status: "CANCELLED" })
        ),
        countByMomentIdAndStatus: vi.fn().mockResolvedValue(5),
        create: vi.fn().mockResolvedValue(
          makeRegistration({ status: "REGISTERED" })
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

      expect(result.registration.status).toBe("REGISTERED");
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

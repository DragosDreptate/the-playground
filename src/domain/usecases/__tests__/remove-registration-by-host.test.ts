import { describe, it, expect, vi } from "vitest";
import { removeRegistrationByHost } from "@/domain/usecases/remove-registration-by-host";
import { createMockRegistrationRepository, makeRegistration } from "./helpers/mock-registration-repository";
import { createMockMomentRepository, makeMoment } from "./helpers/mock-moment-repository";
import { createMockCircleRepository, makeMembership } from "./helpers/mock-circle-repository";
import {
  RegistrationNotFoundError,
  UnauthorizedCircleActionError,
  CannotRemoveHostRegistrationError,
} from "@/domain/errors";

const HOST_ID = "host-user-1";
const PLAYER_ID = "player-user-2";
const CIRCLE_ID = "circle-1";
const MOMENT_ID = "moment-1";
const REGISTRATION_ID = "reg-1";

function makeHostMembership() {
  return makeMembership({ userId: HOST_ID, role: "HOST" });
}

function makePlayerMembership() {
  return makeMembership({ userId: PLAYER_ID, role: "PLAYER" });
}

function makePlayerRegistration(overrides = {}) {
  return makeRegistration({
    id: REGISTRATION_ID,
    momentId: MOMENT_ID,
    userId: PLAYER_ID,
    status: "REGISTERED",
    ...overrides,
  });
}

const defaultDeps = () => ({
  registrationRepository: createMockRegistrationRepository({
    findById: vi.fn().mockResolvedValue(makePlayerRegistration()),
    update: vi.fn().mockImplementation((_, data) =>
      Promise.resolve(makePlayerRegistration(data))
    ),
    findFirstWaitlisted: vi.fn().mockResolvedValue(null),
  }),
  momentRepository: createMockMomentRepository({
    findById: vi.fn().mockResolvedValue(makeMoment({ id: MOMENT_ID, circleId: CIRCLE_ID })),
  }),
  circleRepository: createMockCircleRepository({
    findMembership: vi
      .fn()
      .mockResolvedValueOnce(makeHostMembership())
      .mockResolvedValueOnce(makePlayerMembership()),
  }),
});

describe("removeRegistrationByHost", () => {
  describe("given a registration that does not exist", () => {
    it("should throw RegistrationNotFoundError", async () => {
      const deps = defaultDeps();
      deps.registrationRepository.findById = vi.fn().mockResolvedValue(null);

      await expect(
        removeRegistrationByHost(
          { registrationId: REGISTRATION_ID, hostUserId: HOST_ID },
          deps
        )
      ).rejects.toThrow(RegistrationNotFoundError);
    });
  });

  describe("given a registration already cancelled", () => {
    it("should throw RegistrationNotFoundError", async () => {
      const deps = defaultDeps();
      deps.registrationRepository.findById = vi
        .fn()
        .mockResolvedValue(makePlayerRegistration({ status: "CANCELLED" }));

      await expect(
        removeRegistrationByHost(
          { registrationId: REGISTRATION_ID, hostUserId: HOST_ID },
          deps
        )
      ).rejects.toThrow(RegistrationNotFoundError);
    });
  });

  describe("given a caller who is not HOST of the Circle", () => {
    it("should throw UnauthorizedCircleActionError", async () => {
      const deps = defaultDeps();
      deps.circleRepository.findMembership = vi
        .fn()
        .mockResolvedValue(makePlayerMembership());

      await expect(
        removeRegistrationByHost(
          { registrationId: REGISTRATION_ID, hostUserId: HOST_ID },
          deps
        )
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });

  describe("given a caller who is not a member of the Circle", () => {
    it("should throw UnauthorizedCircleActionError", async () => {
      const deps = defaultDeps();
      deps.circleRepository.findMembership = vi.fn().mockResolvedValue(null);

      await expect(
        removeRegistrationByHost(
          { registrationId: REGISTRATION_ID, hostUserId: HOST_ID },
          deps
        )
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });

  describe("given a target who is a HOST of the Circle", () => {
    it("should throw CannotRemoveHostRegistrationError", async () => {
      const deps = defaultDeps();
      deps.circleRepository.findMembership = vi
        .fn()
        .mockResolvedValueOnce(makeHostMembership()) // caller
        .mockResolvedValueOnce(makeMembership({ userId: PLAYER_ID, role: "HOST" })); // target

      await expect(
        removeRegistrationByHost(
          { registrationId: REGISTRATION_ID, hostUserId: HOST_ID },
          deps
        )
      ).rejects.toThrow(CannotRemoveHostRegistrationError);
    });
  });

  describe("given a valid REGISTERED player with no waitlist", () => {
    it("should cancel the registration and return no promotion", async () => {
      const updateFn = vi.fn().mockImplementation((_, data) =>
        Promise.resolve(makePlayerRegistration(data))
      );
      const deps = defaultDeps();
      deps.registrationRepository.update = updateFn;

      const result = await removeRegistrationByHost(
        { registrationId: REGISTRATION_ID, hostUserId: HOST_ID },
        deps
      );

      expect(updateFn).toHaveBeenCalledWith(REGISTRATION_ID, {
        status: "CANCELLED",
        cancelledAt: expect.any(Date),
      });
      expect(result.cancelledRegistration.status).toBe("CANCELLED");
      expect(result.promotedRegistration).toBeNull();
    });
  });

  describe("given a valid REGISTERED player with someone on waitlist", () => {
    it("should cancel the registration and promote the waitlisted player", async () => {
      const waitlistedReg = makeRegistration({
        id: "reg-2",
        status: "WAITLISTED",
        momentId: MOMENT_ID,
        userId: "user-3",
      });
      const updateFn = vi
        .fn()
        .mockResolvedValueOnce(makePlayerRegistration({ status: "CANCELLED" }))
        .mockResolvedValueOnce({ ...waitlistedReg, status: "REGISTERED" });

      const deps = defaultDeps();
      deps.registrationRepository.findFirstWaitlisted = vi
        .fn()
        .mockResolvedValue(waitlistedReg);
      deps.registrationRepository.update = updateFn;

      const result = await removeRegistrationByHost(
        { registrationId: REGISTRATION_ID, hostUserId: HOST_ID },
        deps
      );

      expect(updateFn).toHaveBeenCalledWith(REGISTRATION_ID, {
        status: "CANCELLED",
        cancelledAt: expect.any(Date),
      });
      expect(updateFn).toHaveBeenCalledWith("reg-2", { status: "REGISTERED" });
      expect(result.promotedRegistration?.status).toBe("REGISTERED");
    });
  });

  describe("given a valid WAITLISTED player", () => {
    it("should cancel the waitlist entry without promoting anyone", async () => {
      const deps = defaultDeps();
      deps.registrationRepository.findById = vi
        .fn()
        .mockResolvedValue(makePlayerRegistration({ status: "WAITLISTED" }));
      const findFirstWaitlisted = vi.fn();
      deps.registrationRepository.findFirstWaitlisted = findFirstWaitlisted;

      const result = await removeRegistrationByHost(
        { registrationId: REGISTRATION_ID, hostUserId: HOST_ID },
        deps
      );

      expect(findFirstWaitlisted).not.toHaveBeenCalled();
      expect(result.promotedRegistration).toBeNull();
    });
  });
});

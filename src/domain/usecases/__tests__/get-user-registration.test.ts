import { describe, it, expect, vi } from "vitest";
import { getUserRegistration } from "@/domain/usecases/get-user-registration";
import {
  createMockRegistrationRepository,
  makeRegistration,
} from "./helpers/mock-registration-repository";

describe("GetUserRegistration", () => {
  const defaultInput = {
    momentId: "moment-1",
    userId: "user-1",
  };

  describe("given the user has an active REGISTERED registration", () => {
    it("should return the registration", async () => {
      const registration = makeRegistration({
        momentId: "moment-1",
        userId: "user-1",
        status: "REGISTERED",
      });
      const registrationRepository = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(registration),
      });

      const result = await getUserRegistration(defaultInput, {
        registrationRepository,
      });

      expect(result).toEqual(registration);
      expect(registrationRepository.findByMomentAndUser).toHaveBeenCalledWith(
        "moment-1",
        "user-1"
      );
    });
  });

  describe("given the user has a WAITLISTED registration", () => {
    it("should return the registration", async () => {
      const registration = makeRegistration({
        momentId: "moment-1",
        userId: "user-1",
        status: "WAITLISTED",
      });
      const registrationRepository = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(registration),
      });

      const result = await getUserRegistration(defaultInput, {
        registrationRepository,
      });

      expect(result).toEqual(registration);
    });
  });

  describe("given the user has a CHECKED_IN registration", () => {
    it("should return the registration", async () => {
      const registration = makeRegistration({
        momentId: "moment-1",
        userId: "user-1",
        status: "CHECKED_IN",
      });
      const registrationRepository = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(registration),
      });

      const result = await getUserRegistration(defaultInput, {
        registrationRepository,
      });

      expect(result).toEqual(registration);
    });
  });

  describe("given the user has a CANCELLED registration", () => {
    it("should return null (cancelled registrations are treated as absent)", async () => {
      const registration = makeRegistration({
        momentId: "moment-1",
        userId: "user-1",
        status: "CANCELLED",
      });
      const registrationRepository = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(registration),
      });

      const result = await getUserRegistration(defaultInput, {
        registrationRepository,
      });

      expect(result).toBeNull();
    });
  });

  describe("given the user has no registration for this Moment", () => {
    it("should return null", async () => {
      const registrationRepository = createMockRegistrationRepository({
        findByMomentAndUser: vi.fn().mockResolvedValue(null),
      });

      const result = await getUserRegistration(defaultInput, {
        registrationRepository,
      });

      expect(result).toBeNull();
    });
  });
});

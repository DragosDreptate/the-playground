import { describe, it, expect, vi } from "vitest";
import { cancelRegistration } from "@/domain/usecases/cancel-registration";
import {
  RegistrationNotFoundError,
  UnauthorizedRegistrationActionError,
} from "@/domain/errors";
import {
  createMockRegistrationRepository,
  makeRegistration,
} from "./helpers/mock-registration-repository";

describe("CancelRegistration", () => {
  const defaultInput = {
    registrationId: "registration-1",
    userId: "user-2",
  };

  describe("given a REGISTERED user cancelling", () => {
    it("should set CANCELLED and promote first WAITLISTED", async () => {
      const waitlistedReg = makeRegistration({
        id: "registration-2",
        userId: "user-3",
        status: "WAITLISTED",
      });
      const promotedReg = makeRegistration({
        id: "registration-2",
        userId: "user-3",
        status: "REGISTERED",
      });

      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(
          makeRegistration({ status: "REGISTERED" })
        ),
        update: vi
          .fn()
          .mockResolvedValueOnce(
            makeRegistration({ status: "CANCELLED", cancelledAt: new Date() })
          )
          .mockResolvedValueOnce(promotedReg),
        findFirstWaitlisted: vi.fn().mockResolvedValue(waitlistedReg),
      });

      const result = await cancelRegistration(defaultInput, {
        registrationRepository: registrationRepo,
      });

      expect(result.registration.status).toBe("CANCELLED");
      expect(result.promotedRegistration).not.toBeNull();
      expect(result.promotedRegistration!.status).toBe("REGISTERED");
      expect(registrationRepo.update).toHaveBeenCalledTimes(2);
    });
  });

  describe("given no waitlisted users", () => {
    it("should cancel without promotion", async () => {
      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(
          makeRegistration({ status: "REGISTERED" })
        ),
        update: vi.fn().mockResolvedValue(
          makeRegistration({ status: "CANCELLED", cancelledAt: new Date() })
        ),
        findFirstWaitlisted: vi.fn().mockResolvedValue(null),
      });

      const result = await cancelRegistration(defaultInput, {
        registrationRepository: registrationRepo,
      });

      expect(result.registration.status).toBe("CANCELLED");
      expect(result.promotedRegistration).toBeNull();
      expect(registrationRepo.update).toHaveBeenCalledTimes(1);
    });
  });

  describe("given a WAITLISTED user cancelling", () => {
    it("should cancel without promoting anyone", async () => {
      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(
          makeRegistration({ status: "WAITLISTED" })
        ),
        update: vi.fn().mockResolvedValue(
          makeRegistration({ status: "CANCELLED", cancelledAt: new Date() })
        ),
      });

      const result = await cancelRegistration(defaultInput, {
        registrationRepository: registrationRepo,
      });

      expect(result.registration.status).toBe("CANCELLED");
      expect(result.promotedRegistration).toBeNull();
      expect(registrationRepo.findFirstWaitlisted).not.toHaveBeenCalled();
    });
  });

  describe("given another user", () => {
    it("should throw UnauthorizedRegistrationActionError", async () => {
      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(
          makeRegistration({ userId: "other-user" })
        ),
      });

      await expect(
        cancelRegistration(defaultInput, {
          registrationRepository: registrationRepo,
        })
      ).rejects.toThrow(UnauthorizedRegistrationActionError);
    });
  });

  describe("given non-existent registration", () => {
    it("should throw RegistrationNotFoundError", async () => {
      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(null),
      });

      await expect(
        cancelRegistration(defaultInput, {
          registrationRepository: registrationRepo,
        })
      ).rejects.toThrow(RegistrationNotFoundError);
    });
  });

  describe("given already CANCELLED", () => {
    it("should throw RegistrationNotFoundError", async () => {
      const registrationRepo = createMockRegistrationRepository({
        findById: vi.fn().mockResolvedValue(
          makeRegistration({ status: "CANCELLED" })
        ),
      });

      await expect(
        cancelRegistration(defaultInput, {
          registrationRepository: registrationRepo,
        })
      ).rejects.toThrow(RegistrationNotFoundError);
    });
  });
});

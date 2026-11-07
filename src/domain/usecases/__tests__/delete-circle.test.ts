import { describe, it, expect, vi } from "vitest";
import { createMockRegistrationRepository } from "./helpers/mock-registration-repository";
import { deleteCircle } from "@/domain/usecases/delete-circle";
import {
  CircleHasUnrefundedPaymentsError,
  CircleNotFoundError,
  UnauthorizedCircleActionError,
} from "@/domain/errors";
import {
  createMockCircleRepository,
  makeCircle,
  makeMembership,
} from "./helpers/mock-circle-repository";

describe("DeleteCircle", () => {
  const defaultInput = {
    circleId: "circle-1",
    userId: "user-1",
  };

  describe("given the user is HOST of the circle", () => {
    it("should delete the circle", async () => {
      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle()),
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
        delete: vi.fn().mockResolvedValue(undefined),
      });

      await deleteCircle(defaultInput, { circleRepository: repo, registrationRepository: createMockRegistrationRepository() });

      expect(repo.delete).toHaveBeenCalledWith("circle-1");
    });
  });

  describe("given the circle does not exist", () => {
    it("should throw CircleNotFoundError", async () => {
      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(null),
      });

      await expect(
        deleteCircle(defaultInput, { circleRepository: repo, registrationRepository: createMockRegistrationRepository() })
      ).rejects.toThrow(CircleNotFoundError);
    });
  });

  describe("given the user is not a member", () => {
    it("should throw UnauthorizedCircleActionError", async () => {
      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle()),
        findMembership: vi.fn().mockResolvedValue(null),
      });

      await expect(
        deleteCircle(defaultInput, { circleRepository: repo, registrationRepository: createMockRegistrationRepository() })
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });

  describe("given the user is PLAYER (not HOST)", () => {
    it("should throw UnauthorizedCircleActionError", async () => {
      const repo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle()),
        findMembership: vi
          .fn()
          .mockResolvedValue(makeMembership({ role: "PLAYER" })),
      });

      await expect(
        deleteCircle(defaultInput, { circleRepository: repo, registrationRepository: createMockRegistrationRepository() })
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });
});

describe("DeleteCircle — unrefunded payments", () => {
  it("should refuse to delete a Circle with Participants paid and not refunded", async () => {
    const circleRepository = createMockCircleRepository({
      findById: vi.fn().mockResolvedValue(makeCircle({ id: "circle-1" })),
      findMembership: vi.fn().mockResolvedValue(makeMembership({ userId: "user-1", circleId: "circle-1", role: "HOST" })),
    });
    const registrationRepository = createMockRegistrationRepository({
      hasUnrefundedPaymentsInCircle: vi.fn().mockResolvedValue(true),
    });

    await expect(
      deleteCircle({ circleId: "circle-1", userId: "user-1" }, { circleRepository, registrationRepository })
    ).rejects.toThrow(CircleHasUnrefundedPaymentsError);
    expect(circleRepository.delete).not.toHaveBeenCalled();
  });
});

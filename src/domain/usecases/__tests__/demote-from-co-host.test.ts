import { describe, it, expect, vi } from "vitest";
import { demoteFromCoHost } from "@/domain/usecases/demote-from-co-host";
import {
  createMockCircleRepository,
  makeCircle,
  makeMembership,
} from "./helpers/mock-circle-repository";
import { createMockUserRepository, makeUser } from "./helpers/mock-user-repository";
import { createMockEmailService } from "./helpers/mock-email-service";
import {
  UnauthorizedCircleActionError,
  NotMemberOfCircleError,
  InvalidDemotionTargetError,
} from "@/domain/errors";

const CIRCLE_ID = "circle-1";
const HOST_ID = "host-user-1";
const TARGET_ID = "target-user-2";

function makeInput() {
  return { circleId: CIRCLE_ID, hostUserId: HOST_ID, targetUserId: TARGET_ID };
}

describe("demoteFromCoHost", () => {
  describe("given the caller is not the HOST", () => {
    it("should throw UnauthorizedCircleActionError when caller is CO_HOST", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(
          makeMembership({ userId: HOST_ID, role: "CO_HOST", status: "ACTIVE" })
        ),
      });

      await expect(
        demoteFromCoHost(makeInput(), {
          circleRepository: circleRepo,
          userRepository: createMockUserRepository(),
        })
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });

    it("should throw UnauthorizedCircleActionError when caller HOST is PENDING", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(
          makeMembership({ userId: HOST_ID, role: "HOST", status: "PENDING" })
        ),
      });

      await expect(
        demoteFromCoHost(makeInput(), {
          circleRepository: circleRepo,
          userRepository: createMockUserRepository(),
        })
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });

  describe("given the target is not a member", () => {
    it("should throw NotMemberOfCircleError", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi
          .fn()
          .mockResolvedValueOnce(makeMembership({ role: "HOST", status: "ACTIVE" }))
          .mockResolvedValueOnce(null),
      });

      await expect(
        demoteFromCoHost(makeInput(), {
          circleRepository: circleRepo,
          userRepository: createMockUserRepository(),
        })
      ).rejects.toThrow(NotMemberOfCircleError);
    });
  });

  describe("given the target is not a CO_HOST", () => {
    it("should throw InvalidDemotionTargetError when target is PLAYER", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi
          .fn()
          .mockResolvedValueOnce(makeMembership({ role: "HOST", status: "ACTIVE" }))
          .mockResolvedValueOnce(
            makeMembership({ userId: TARGET_ID, role: "PLAYER", status: "ACTIVE" })
          ),
      });

      await expect(
        demoteFromCoHost(makeInput(), {
          circleRepository: circleRepo,
          userRepository: createMockUserRepository(),
        })
      ).rejects.toThrow(InvalidDemotionTargetError);
    });

    it("should throw InvalidDemotionTargetError when target is HOST", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi
          .fn()
          .mockResolvedValueOnce(makeMembership({ role: "HOST", status: "ACTIVE" }))
          .mockResolvedValueOnce(
            makeMembership({ userId: TARGET_ID, role: "HOST", status: "ACTIVE" })
          ),
      });

      await expect(
        demoteFromCoHost(makeInput(), {
          circleRepository: circleRepo,
          userRepository: createMockUserRepository(),
        })
      ).rejects.toThrow(InvalidDemotionTargetError);
    });
  });

  describe("given a valid demotion (HOST caller, CO_HOST target)", () => {
    it("should update the role to PLAYER", async () => {
      const updateRoleMock = vi.fn().mockResolvedValue(
        makeMembership({ userId: TARGET_ID, role: "PLAYER", status: "ACTIVE" })
      );
      const circleRepo = createMockCircleRepository({
        findMembership: vi
          .fn()
          .mockResolvedValueOnce(makeMembership({ role: "HOST", status: "ACTIVE" }))
          .mockResolvedValueOnce(
            makeMembership({ userId: TARGET_ID, role: "CO_HOST", status: "ACTIVE" })
          ),
        updateMembershipRole: updateRoleMock,
      });

      const result = await demoteFromCoHost(makeInput(), {
        circleRepository: circleRepo,
        userRepository: createMockUserRepository(),
      });

      expect(updateRoleMock).toHaveBeenCalledWith(CIRCLE_ID, TARGET_ID, "PLAYER");
      expect(result.role).toBe("PLAYER");
    });

    it("should send a demotion email when emailService is provided (D19)", async () => {
      const emailService = createMockEmailService();
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle()),
        findMembership: vi
          .fn()
          .mockResolvedValueOnce(makeMembership({ role: "HOST", status: "ACTIVE" }))
          .mockResolvedValueOnce(
            makeMembership({ userId: TARGET_ID, role: "CO_HOST", status: "ACTIVE" })
          ),
        updateMembershipRole: vi.fn().mockResolvedValue(
          makeMembership({ userId: TARGET_ID, role: "PLAYER", status: "ACTIVE" })
        ),
      });
      const userRepo = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(makeUser({ id: TARGET_ID })),
      });

      await demoteFromCoHost(makeInput(), {
        circleRepository: circleRepo,
        userRepository: userRepo,
        emailService,
        emailStrings: {
          demoted: async () => ({
            subject: "s", heading: "h", intro: "i", newRoleLabel: "n",
            registrationsNote: "r", ctaLabel: "c", footer: "f", preferencesLink: "p",
          }),
        },
      });

      expect(emailService.sendCoHostDemoted).toHaveBeenCalledTimes(1);
    });
  });
});

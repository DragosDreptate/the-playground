import { describe, it, expect, vi } from "vitest";
import { promoteToCoHost } from "@/domain/usecases/promote-to-co-host";
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
  CannotPromotePendingMemberError,
  InvalidPromotionTargetError,
} from "@/domain/errors";

const CIRCLE_ID = "circle-1";
const HOST_ID = "host-user-1";
const TARGET_ID = "target-user-2";

function makeInput() {
  return { circleId: CIRCLE_ID, hostUserId: HOST_ID, targetUserId: TARGET_ID };
}

describe("promoteToCoHost", () => {
  describe("given the caller is not the HOST of the Circle", () => {
    it("should throw UnauthorizedCircleActionError when caller is a CO_HOST", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(
          makeMembership({ userId: HOST_ID, role: "CO_HOST", status: "ACTIVE" })
        ),
      });

      await expect(
        promoteToCoHost(makeInput(), {
          circleRepository: circleRepo,
          userRepository: createMockUserRepository(),
        })
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });

    it("should throw UnauthorizedCircleActionError when caller is a PLAYER", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(
          makeMembership({ userId: HOST_ID, role: "PLAYER", status: "ACTIVE" })
        ),
      });

      await expect(
        promoteToCoHost(makeInput(), {
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
        promoteToCoHost(makeInput(), {
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
        promoteToCoHost(makeInput(), {
          circleRepository: circleRepo,
          userRepository: createMockUserRepository(),
        })
      ).rejects.toThrow(NotMemberOfCircleError);
    });
  });

  describe("given the target membership is PENDING", () => {
    it("should throw CannotPromotePendingMemberError (D22)", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi
          .fn()
          .mockResolvedValueOnce(makeMembership({ role: "HOST", status: "ACTIVE" }))
          .mockResolvedValueOnce(
            makeMembership({ userId: TARGET_ID, role: "PLAYER", status: "PENDING" })
          ),
      });

      await expect(
        promoteToCoHost(makeInput(), {
          circleRepository: circleRepo,
          userRepository: createMockUserRepository(),
        })
      ).rejects.toThrow(CannotPromotePendingMemberError);
    });
  });

  describe("given the target is already a CO_HOST or HOST", () => {
    it("should throw InvalidPromotionTargetError when target is CO_HOST", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi
          .fn()
          .mockResolvedValueOnce(makeMembership({ role: "HOST", status: "ACTIVE" }))
          .mockResolvedValueOnce(
            makeMembership({ userId: TARGET_ID, role: "CO_HOST", status: "ACTIVE" })
          ),
      });

      await expect(
        promoteToCoHost(makeInput(), {
          circleRepository: circleRepo,
          userRepository: createMockUserRepository(),
        })
      ).rejects.toThrow(InvalidPromotionTargetError);
    });

    it("should throw InvalidPromotionTargetError when target is HOST", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi
          .fn()
          .mockResolvedValueOnce(makeMembership({ role: "HOST", status: "ACTIVE" }))
          .mockResolvedValueOnce(
            makeMembership({ userId: TARGET_ID, role: "HOST", status: "ACTIVE" })
          ),
      });

      await expect(
        promoteToCoHost(makeInput(), {
          circleRepository: circleRepo,
          userRepository: createMockUserRepository(),
        })
      ).rejects.toThrow(InvalidPromotionTargetError);
    });
  });

  describe("given a valid promotion (HOST caller, ACTIVE PLAYER target)", () => {
    it("should update the role to CO_HOST", async () => {
      const updateRoleMock = vi
        .fn()
        .mockResolvedValue(
          makeMembership({ userId: TARGET_ID, role: "CO_HOST", status: "ACTIVE" })
        );
      const circleRepo = createMockCircleRepository({
        findMembership: vi
          .fn()
          .mockResolvedValueOnce(makeMembership({ role: "HOST", status: "ACTIVE" }))
          .mockResolvedValueOnce(
            makeMembership({ userId: TARGET_ID, role: "PLAYER", status: "ACTIVE" })
          ),
        updateMembershipRole: updateRoleMock,
      });

      const result = await promoteToCoHost(makeInput(), {
        circleRepository: circleRepo,
        userRepository: createMockUserRepository(),
      });

      expect(updateRoleMock).toHaveBeenCalledWith(CIRCLE_ID, TARGET_ID, "CO_HOST");
      expect(result.role).toBe("CO_HOST");
    });

    it("should send a promotion email when emailService is provided (D19)", async () => {
      const emailService = createMockEmailService();
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle()),
        findMembership: vi
          .fn()
          .mockResolvedValueOnce(makeMembership({ role: "HOST", status: "ACTIVE" }))
          .mockResolvedValueOnce(
            makeMembership({ userId: TARGET_ID, role: "PLAYER", status: "ACTIVE" })
          ),
        updateMembershipRole: vi.fn().mockResolvedValue(
          makeMembership({ userId: TARGET_ID, role: "CO_HOST", status: "ACTIVE" })
        ),
      });
      const userRepo = createMockUserRepository({
        findById: vi.fn()
          .mockResolvedValueOnce(makeUser({ id: TARGET_ID, email: "target@example.com" }))
          .mockResolvedValueOnce(makeUser({ id: HOST_ID, firstName: "Alice", lastName: "Martin" })),
      });

      const promotedBy = vi.fn(async ({ inviterName: _n }: { inviterName: string; circleName: string }) => ({
        subject: "s", heading: "h", intro: "i",
        rightsTitle: "t", rightCreateEvents: "r1", rightManageRegistrations: "r2",
        rightUpdateCircle: "r3", rightBroadcast: "r4", rightReceiveNotifications: "r5",
        limitsNote: "l", ctaLabel: "c", footer: "f", leaveLink: "ll",
      }));

      await promoteToCoHost(makeInput(), {
        circleRepository: circleRepo,
        userRepository: userRepo,
        emailService,
        emailStrings: { promotedBy },
      });

      expect(emailService.sendCoHostPromoted).toHaveBeenCalledTimes(1);
      expect(promotedBy).toHaveBeenCalledWith({
        inviterName: "Alice Martin",
        circleName: "My Circle",
      });
    });

    it("should not throw when email sending fails (best-effort)", async () => {
      const emailService = createMockEmailService({
        sendCoHostPromoted: vi.fn().mockRejectedValue(new Error("email down")),
      });
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle()),
        findMembership: vi
          .fn()
          .mockResolvedValueOnce(makeMembership({ role: "HOST", status: "ACTIVE" }))
          .mockResolvedValueOnce(
            makeMembership({ userId: TARGET_ID, role: "PLAYER", status: "ACTIVE" })
          ),
        updateMembershipRole: vi.fn().mockResolvedValue(
          makeMembership({ userId: TARGET_ID, role: "CO_HOST", status: "ACTIVE" })
        ),
      });
      const userRepo = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(makeUser()),
      });

      await expect(
        promoteToCoHost(makeInput(), {
          circleRepository: circleRepo,
          userRepository: userRepo,
          emailService,
          emailStrings: {
            promotedBy: async () => ({
              subject: "s", heading: "h", intro: "i",
              rightsTitle: "t", rightCreateEvents: "r1", rightManageRegistrations: "r2",
              rightUpdateCircle: "r3", rightBroadcast: "r4", rightReceiveNotifications: "r5",
              limitsNote: "l", ctaLabel: "c", footer: "f", leaveLink: "ll",
            }),
          },
        })
      ).resolves.toBeDefined();
    });
  });
});

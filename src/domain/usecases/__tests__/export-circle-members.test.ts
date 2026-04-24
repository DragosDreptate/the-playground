import { describe, it, expect, vi } from "vitest";
import { exportCircleMembers } from "@/domain/usecases/export-circle-members";
import {
  createMockCircleRepository,
  makeCircle,
  makeMembership,
} from "./helpers/mock-circle-repository";
import { CircleNotFoundError, UnauthorizedCircleActionError } from "@/domain/errors";
import type { CircleMemberWithUser } from "@/domain/models/circle";

const CIRCLE_ID = "circle-1";
const CALLER_ID = "caller-1";

function makeMemberWithUser(overrides: Partial<CircleMemberWithUser> = {}): CircleMemberWithUser {
  return {
    id: "membership-x",
    userId: "user-x",
    circleId: CIRCLE_ID,
    role: "PLAYER",
    status: "ACTIVE",
    joinedAt: new Date("2026-01-01"),
    user: {
      id: "user-x",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      image: null,
      publicId: "pub-x",
    },
    ...overrides,
  };
}

describe("exportCircleMembers", () => {
  describe("given the caller is anonymous", () => {
    it("should throw UnauthorizedCircleActionError", async () => {
      await expect(
        exportCircleMembers(
          { circleId: CIRCLE_ID, callerUserId: null },
          { circleRepository: createMockCircleRepository() },
        ),
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });

  describe("given the Circle does not exist", () => {
    it("should throw CircleNotFoundError", async () => {
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(null),
      });

      await expect(
        exportCircleMembers(
          { circleId: CIRCLE_ID, callerUserId: CALLER_ID },
          { circleRepository: circleRepo },
        ),
      ).rejects.toThrow(CircleNotFoundError);
    });
  });

  describe("given the caller is not HOST or CO_HOST", () => {
    it("should throw UnauthorizedCircleActionError when caller is a PLAYER", async () => {
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle()),
        findMembership: vi
          .fn()
          .mockResolvedValue(makeMembership({ userId: CALLER_ID, role: "PLAYER", status: "ACTIVE" })),
      });

      await expect(
        exportCircleMembers(
          { circleId: CIRCLE_ID, callerUserId: CALLER_ID },
          { circleRepository: circleRepo },
        ),
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });

    it("should throw UnauthorizedCircleActionError when caller is not a member", async () => {
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle()),
        findMembership: vi.fn().mockResolvedValue(null),
      });

      await expect(
        exportCircleMembers(
          { circleId: CIRCLE_ID, callerUserId: CALLER_ID },
          { circleRepository: circleRepo },
        ),
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });

    it("should throw UnauthorizedCircleActionError when caller HOST is PENDING", async () => {
      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle()),
        findMembership: vi
          .fn()
          .mockResolvedValue(makeMembership({ userId: CALLER_ID, role: "HOST", status: "PENDING" })),
      });

      await expect(
        exportCircleMembers(
          { circleId: CIRCLE_ID, callerUserId: CALLER_ID },
          { circleRepository: circleRepo },
        ),
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });

  describe("given the caller is HOST or CO_HOST", () => {
    it("should return organizers first, then players when caller is HOST", async () => {
      const host = makeMemberWithUser({ id: "m-1", role: "HOST", user: { ...makeMemberWithUser().user, id: "u-host" } });
      const coHost = makeMemberWithUser({ id: "m-2", role: "CO_HOST", user: { ...makeMemberWithUser().user, id: "u-cohost" } });
      const player = makeMemberWithUser({ id: "m-3", role: "PLAYER", user: { ...makeMemberWithUser().user, id: "u-player" } });

      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle()),
        findMembership: vi
          .fn()
          .mockResolvedValue(makeMembership({ userId: CALLER_ID, role: "HOST", status: "ACTIVE" })),
        findOrganizers: vi.fn().mockResolvedValue([host, coHost]),
        findMembersByRole: vi.fn().mockResolvedValue([player]),
      });

      const result = await exportCircleMembers(
        { circleId: CIRCLE_ID, callerUserId: CALLER_ID },
        { circleRepository: circleRepo },
      );

      expect(result.map((m) => m.role)).toEqual(["HOST", "CO_HOST", "PLAYER"]);
      expect(circleRepo.findMembersByRole).toHaveBeenCalledWith(CIRCLE_ID, "PLAYER");
    });

    it("should return all active members when caller is CO_HOST", async () => {
      const host = makeMemberWithUser({ id: "m-1", role: "HOST", user: { ...makeMemberWithUser().user, id: "u-host" } });
      const players = [
        makeMemberWithUser({ id: "m-3", role: "PLAYER", user: { ...makeMemberWithUser().user, id: "u-p1" } }),
        makeMemberWithUser({ id: "m-4", role: "PLAYER", user: { ...makeMemberWithUser().user, id: "u-p2" } }),
      ];

      const circleRepo = createMockCircleRepository({
        findById: vi.fn().mockResolvedValue(makeCircle()),
        findMembership: vi
          .fn()
          .mockResolvedValue(makeMembership({ userId: CALLER_ID, role: "CO_HOST", status: "ACTIVE" })),
        findOrganizers: vi.fn().mockResolvedValue([host]),
        findMembersByRole: vi.fn().mockResolvedValue(players),
      });

      const result = await exportCircleMembers(
        { circleId: CIRCLE_ID, callerUserId: CALLER_ID },
        { circleRepository: circleRepo },
      );

      expect(result).toHaveLength(3);
      expect(result.map((m) => m.user.id)).toEqual(["u-host", "u-p1", "u-p2"]);
    });
  });
});

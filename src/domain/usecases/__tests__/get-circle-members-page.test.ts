import { describe, it, expect, vi } from "vitest";
import { getCircleMembersPage } from "@/domain/usecases/get-circle-members-page";
import {
  createMockCircleRepository,
  makeCircle,
  makeMembership,
} from "./helpers/mock-circle-repository";
import type { CircleMemberWithUser } from "@/domain/models/circle";
import { CircleNotFoundError, UnauthorizedCircleActionError } from "@/domain/errors";

const CIRCLE_ID = "circle-1";
const CALLER_ID = "caller-1";

function makeMember(): CircleMemberWithUser {
  return {
    ...makeMembership({ userId: "member-2", role: "PLAYER", status: "ACTIVE" }),
    user: {
      id: "member-2",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      image: null,
      publicId: "pub-ada",
    },
  };
}

function makeDeps(
  overrides: {
    circle?: ReturnType<typeof makeCircle> | null;
    membership?: ReturnType<typeof makeMembership> | null;
    members?: CircleMemberWithUser[];
  } = {},
) {
  const circle =
    overrides.circle === undefined
      ? makeCircle({ id: CIRCLE_ID, visibility: "PUBLIC" })
      : overrides.circle;
  const members = overrides.members ?? [];
  const circleRepository = createMockCircleRepository({
    findById: vi.fn().mockResolvedValue(circle),
    findMembership: vi.fn().mockResolvedValue(overrides.membership ?? null),
    findMembersPaginated: vi
      .fn()
      .mockResolvedValue({ members, total: members.length, hasMore: false }),
  });
  return { circleRepository };
}

describe("getCircleMembersPage", () => {
  describe("given the caller is anonymous", () => {
    it("should throw UnauthorizedCircleActionError", async () => {
      await expect(
        getCircleMembersPage(
          { circleId: CIRCLE_ID, offset: 0, limit: 20, callerUserId: null },
          makeDeps(),
        ),
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });

  describe("given the Circle does not exist", () => {
    it("should throw CircleNotFoundError", async () => {
      await expect(
        getCircleMembersPage(
          { circleId: CIRCLE_ID, offset: 0, limit: 20, callerUserId: CALLER_ID },
          makeDeps({ circle: null }),
        ),
      ).rejects.toThrow(CircleNotFoundError);
    });
  });

  describe("given a PRIVATE Circle and the caller is not an ACTIVE member", () => {
    it("should throw UnauthorizedCircleActionError", async () => {
      const deps = makeDeps({
        circle: makeCircle({ id: CIRCLE_ID, visibility: "PRIVATE" }),
        membership: null,
      });

      await expect(
        getCircleMembersPage(
          { circleId: CIRCLE_ID, offset: 0, limit: 20, callerUserId: CALLER_ID },
          deps,
        ),
      ).rejects.toThrow(UnauthorizedCircleActionError);
    });
  });

  describe("given the caller is an active Organizer", () => {
    it("should return members with email intact", async () => {
      const deps = makeDeps({
        membership: makeMembership({ userId: CALLER_ID }), // HOST/ACTIVE par défaut
        members: [makeMember()],
      });

      const result = await getCircleMembersPage(
        { circleId: CIRCLE_ID, offset: 0, limit: 20, callerUserId: CALLER_ID },
        deps,
      );

      expect(result.members[0].user.email).toBe("ada@example.com");
    });
  });

  describe("given the caller is authorized but not an Organizer", () => {
    it("should redact member emails on a PUBLIC Circle (no membership)", async () => {
      const deps = makeDeps({ members: [makeMember()] });

      const result = await getCircleMembersPage(
        { circleId: CIRCLE_ID, offset: 0, limit: 20, callerUserId: CALLER_ID },
        deps,
      );

      expect(result.members[0].user.email).toBe("");
      // Champs non sensibles préservés (affichage social proof).
      expect(result.members[0].user.firstName).toBe("Ada");
      expect(result.members[0].user.publicId).toBe("pub-ada");
    });

    it("should redact even for an ACTIVE PLAYER member (organizer role required)", async () => {
      const deps = makeDeps({
        membership: makeMembership({ userId: CALLER_ID, role: "PLAYER", status: "ACTIVE" }),
        members: [makeMember()],
      });

      const result = await getCircleMembersPage(
        { circleId: CIRCLE_ID, offset: 0, limit: 20, callerUserId: CALLER_ID },
        deps,
      );

      expect(result.members[0].user.email).toBe("");
    });
  });
});

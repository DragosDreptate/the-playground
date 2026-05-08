import { describe, it, expect } from "vitest";
import { computeMembersMeta } from "@/lib/circle-helpers";
import { MEMBER_AVATARS_MAX } from "@/lib/circle-constants";
import type { CircleMemberWithUser } from "@/domain/models/circle";

function makeMember(overrides: {
  id: string;
  firstName?: string | null;
  joinedAtMs?: number;
}): CircleMemberWithUser {
  return {
    id: overrides.id,
    userId: overrides.id,
    circleId: "circle-1",
    role: "PLAYER",
    status: "ACTIVE",
    joinedAt: new Date(overrides.joinedAtMs ?? 1_700_000_000_000),
    user: {
      id: overrides.id,
      firstName: overrides.firstName ?? overrides.id,
      lastName: null,
      email: `${overrides.id}@test.playground`,
      image: null,
      publicId: null,
    },
  };
}

// Translator factice qui rend l'ICU plural manuellement pour tester l'usage de
// `count` côté caller. Le rendu réel est testé par next-intl.
const translate: Parameters<typeof computeMembersMeta>[3] = (key, values) => {
  if (key === "detail.andOthers") {
    const count = (values?.count as number) ?? 0;
    return count === 1 ? "et 1 autre" : `et ${count} autres`;
  }
  return key;
};

describe("computeMembersMeta", () => {
  describe("given fewer members than the avatars cap", () => {
    it("renders all avatars and no mobile 'others' suffix", () => {
      const members = [
        makeMember({ id: "alice", firstName: "Alice" }),
        makeMember({ id: "bob", firstName: "Bob" }),
        makeMember({ id: "carol", firstName: "Carol" }),
      ];

      const result = computeMembersMeta([], members, members.length, translate);

      expect(result.visibleAvatars).toHaveLength(3);
      expect(result.metaText).toBe("Alice, Bob et 1 autre");
      expect(result.metaMobileText).toBe("");
    });

    it("renders only the names when total equals NAMES_TO_SHOW", () => {
      const members = [
        makeMember({ id: "alice", firstName: "Alice" }),
        makeMember({ id: "bob", firstName: "Bob" }),
      ];

      const result = computeMembersMeta([], members, members.length, translate);

      expect(result.metaText).toBe("Alice, Bob");
      expect(result.metaMobileText).toBe("");
    });
  });

  describe("given total exactly equals MEMBER_AVATARS_MAX", () => {
    it("shows all avatars and no mobile suffix", () => {
      const members = Array.from({ length: MEMBER_AVATARS_MAX }, (_, i) =>
        makeMember({ id: `m${i}`, firstName: `M${i}` }),
      );

      const result = computeMembersMeta([], members, members.length, translate);

      expect(result.visibleAvatars).toHaveLength(MEMBER_AVATARS_MAX);
      expect(result.metaMobileText).toBe("");
    });
  });

  describe("given total exceeds MEMBER_AVATARS_MAX by one (the bug case)", () => {
    it("references avatars in mobile text, not desktop names", () => {
      const totalCount = MEMBER_AVATARS_MAX + 1;
      const members = Array.from({ length: totalCount }, (_, i) =>
        makeMember({ id: `m${i}`, firstName: `M${i}` }),
      );

      const result = computeMembersMeta([], members, totalCount, translate);

      expect(result.visibleAvatars).toHaveLength(MEMBER_AVATARS_MAX);
      expect(result.metaText).toBe(`M0, M1 et ${totalCount - 2} autres`);
      expect(result.metaMobileText).toBe("et 1 autre");
    });
  });

  describe("given total far exceeds MEMBER_AVATARS_MAX", () => {
    it("computes mobile suffix from avatar count, not name count", () => {
      const totalCount = MEMBER_AVATARS_MAX + 7;
      const members = Array.from({ length: MEMBER_AVATARS_MAX + 2 }, (_, i) =>
        makeMember({ id: `m${i}`, firstName: `M${i}` }),
      );

      const result = computeMembersMeta([], members, totalCount, translate);

      expect(result.metaText).toBe(`M0, M1 et ${totalCount - 2} autres`);
      expect(result.metaMobileText).toBe("et 7 autres");
    });
  });

  describe("given hosts and players mixed", () => {
    it("sorts by joinedAt ascending and picks the earliest as visible avatars", () => {
      const earlyHost = makeMember({
        id: "early-host",
        firstName: "Early",
        joinedAtMs: 1_000,
      });
      const lateHost = makeMember({
        id: "late-host",
        firstName: "Late",
        joinedAtMs: 9_000,
      });
      const midPlayer = makeMember({
        id: "mid-player",
        firstName: "Mid",
        joinedAtMs: 5_000,
      });

      const result = computeMembersMeta(
        [earlyHost, lateHost],
        [midPlayer],
        3,
        translate,
      );

      expect(result.visibleAvatars.map((m) => m.id)).toEqual([
        "early-host",
        "mid-player",
        "late-host",
      ]);
    });
  });
});

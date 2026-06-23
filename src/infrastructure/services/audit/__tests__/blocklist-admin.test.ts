import { afterEach, describe, expect, it, vi } from "vitest";

const { deleteManyMock } = vi.hoisted(() => ({ deleteManyMock: vi.fn() }));
vi.mock("@/infrastructure/db/prisma", () => ({
  prisma: { session: { deleteMany: deleteManyMock } },
}));

import {
  buildBlockedUsersFilter,
  removeTargetsFromBlocklist,
  revokeSessionsForTargets,
} from "@/infrastructure/services/audit/blocklist-admin";

afterEach(() => deleteManyMock.mockReset());

describe("buildBlockedUsersFilter", () => {
  describe("given aucune cible exploitable", () => {
    it("renvoie null (jamais de deleteMany sans where)", () => {
      expect(buildBlockedUsersFilter({})).toBeNull();
      expect(
        buildBlockedUsersFilter({ emails: [""], oauthIds: [""], domains: [] })
      ).toBeNull();
    });
  });

  describe("given un blocage de compte (email + oauthIds)", () => {
    it("matche par email exact OU par providerAccountId", () => {
      expect(
        buildBlockedUsersFilter({
          emails: ["spam@nms.asia"],
          oauthIds: ["g-1", "gh-2"],
        })
      ).toEqual({
        OR: [
          { email: { in: ["spam@nms.asia"] } },
          { accounts: { some: { providerAccountId: { in: ["g-1", "gh-2"] } } } },
        ],
      });
    });
  });

  describe("given un blocage de domaine", () => {
    it("matche le domaine ET ses sous-domaines, insensible à la casse", () => {
      expect(buildBlockedUsersFilter({ domains: ["NMS.asia"] })).toEqual({
        OR: [
          { email: { endsWith: "@nms.asia", mode: "insensitive" } },
          { email: { endsWith: ".nms.asia", mode: "insensitive" } },
        ],
      });
    });
  });
});

describe("removeTargetsFromBlocklist", () => {
  const current = {
    emails: ["spam@nms.asia", "keep@gmail.com"],
    oauthIds: ["g-1", "g-keep"],
    domains: ["nms.asia", "keep.com"],
  };

  it("retire la cible et conserve le reste", () => {
    expect(
      removeTargetsFromBlocklist(current, {
        emails: ["spam@nms.asia"],
        oauthIds: ["g-1"],
        domains: ["nms.asia"],
      })
    ).toEqual({
      emails: ["keep@gmail.com"],
      oauthIds: ["g-keep"],
      domains: ["keep.com"],
    });
  });

  it("matche email et domaine quelle que soit la casse", () => {
    expect(
      removeTargetsFromBlocklist(current, {
        emails: ["SPAM@NMS.asia"],
        domains: ["NMS.ASIA"],
      }).emails
    ).toEqual(["keep@gmail.com"]);
  });

  it("est idempotent : retirer une entrée absente ne change rien", () => {
    expect(
      removeTargetsFromBlocklist(current, { emails: ["ghost@x.com"] })
    ).toEqual(current);
  });
});

describe("revokeSessionsForTargets", () => {
  it("ne supprime rien sans cible exploitable (garde anti deleteMany sans where)", async () => {
    expect(await revokeSessionsForTargets({})).toBe(0);
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  it("supprime les sessions des users visés via le filtre de relation", async () => {
    deleteManyMock.mockResolvedValue({ count: 3 });
    const n = await revokeSessionsForTargets({ emails: ["spam@nms.asia"] });
    expect(n).toBe(3);
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { user: { OR: [{ email: { in: ["spam@nms.asia"] } }] } },
    });
  });
});

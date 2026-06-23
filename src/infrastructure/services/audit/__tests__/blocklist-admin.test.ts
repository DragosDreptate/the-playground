import { describe, expect, it } from "vitest";

import { buildBlockedUsersFilter } from "@/infrastructure/services/audit/blocklist-admin";

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
    it("matche tous les emails du domaine, en insensible à la casse", () => {
      expect(buildBlockedUsersFilter({ domains: ["NMS.asia"] })).toEqual({
        OR: [{ email: { endsWith: "@nms.asia", mode: "insensitive" } }],
      });
    });
  });
});

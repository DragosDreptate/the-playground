import { describe, expect, it } from "vitest";

import {
  buildBlockedUsersFilter,
  removeTargetsFromBlocklist,
} from "@/infrastructure/services/audit/blocklist-admin";

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

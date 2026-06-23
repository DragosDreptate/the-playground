import { describe, expect, it } from "vitest";

import { toAuditTargets } from "@/infrastructure/services/audit/block-targets";

describe("toAuditTargets", () => {
  describe("given un vrai domaine", () => {
    it("renvoie email, domaine, oauthIds et la raison du blocage", () => {
      expect(
        toAuditTargets({
          email: "spam@nms.asia",
          oauthIds: ["g-123", "gh-456"],
          emailDomain: "nms.asia",
          blockReason: null,
        })
      ).toEqual({
        email: "spam@nms.asia",
        domain: "nms.asia",
        oauthIds: ["g-123", "gh-456"],
        blockReason: null,
      });
    });
  });

  describe("given un domaine non résolu", () => {
    it("ne propose pas « unknown » comme cible de domaine", () => {
      expect(
        toAuditTargets({
          email: "x@y",
          oauthIds: [],
          emailDomain: "unknown",
          blockReason: null,
        }).domain
      ).toBeNull();
    });

    it("ne propose pas un domaine vide comme cible", () => {
      expect(
        toAuditTargets({
          email: "x@y",
          oauthIds: [],
          emailDomain: "",
          blockReason: null,
        }).domain
      ).toBeNull();
    });
  });

  describe("given un compte déjà bloqué", () => {
    it("remonte la raison du blocage (canal)", () => {
      expect(
        toAuditTargets({
          email: "a@b.com",
          oauthIds: [],
          emailDomain: "b.com",
          blockReason: "domain",
        }).blockReason
      ).toBe("domain");
    });
  });
});

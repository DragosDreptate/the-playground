import { describe, expect, it } from "vitest";

import { toAuditTargets } from "@/infrastructure/services/audit/block-targets";

describe("toAuditTargets", () => {
  describe("given un vrai domaine", () => {
    it("renvoie email, domaine, oauthIds et statut bloqué", () => {
      expect(
        toAuditTargets({
          email: "spam@nms.asia",
          oauthIds: ["g-123", "gh-456"],
          emailDomain: "nms.asia",
          blocked: false,
        })
      ).toEqual({
        email: "spam@nms.asia",
        domain: "nms.asia",
        oauthIds: ["g-123", "gh-456"],
        alreadyBlocked: false,
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
          blocked: false,
        }).domain
      ).toBeNull();
    });

    it("ne propose pas un domaine vide comme cible", () => {
      expect(
        toAuditTargets({
          email: "x@y",
          oauthIds: [],
          emailDomain: "",
          blocked: false,
        }).domain
      ).toBeNull();
    });
  });

  describe("given un compte déjà bloqué", () => {
    it("remonte alreadyBlocked = true", () => {
      expect(
        toAuditTargets({
          email: "a@b.com",
          oauthIds: [],
          emailDomain: "b.com",
          blocked: true,
        }).alreadyBlocked
      ).toBe(true);
    });
  });
});

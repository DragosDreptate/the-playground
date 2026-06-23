import { describe, expect, it } from "vitest";

import { resolveBlockedSignInDistinctId } from "@/lib/auth/blocked-sign-in";

describe("resolveBlockedSignInDistinctId", () => {
  describe("given un cookie PostHog présent (vrai navigateur)", () => {
    it("relie le rejet à la person du navigateur", () => {
      expect(resolveBlockedSignInDistinctId("01890-abc-person", "nms.asia")).toBe(
        "01890-abc-person"
      );
    });
  });

  describe("given aucun cookie (bot, hit direct, client PostHog bloqué)", () => {
    it("regroupe par domaine plutôt que par email", () => {
      expect(resolveBlockedSignInDistinctId(null, "nms.asia")).toBe(
        "blocked:nms.asia"
      );
    });

    it("ne crée qu'une person par domaine quels que soient les localparts", () => {
      // fj131744@ et fj131745@ d'un scanner sur le même domaine → même person.
      const a = resolveBlockedSignInDistinctId(null, "nms.asia");
      const b = resolveBlockedSignInDistinctId(null, "nms.asia");
      expect(a).toBe(b);
    });

    it("retombe sur le domaine sentinelle quand le domaine est inconnu", () => {
      expect(resolveBlockedSignInDistinctId(null, "unknown")).toBe(
        "blocked:unknown"
      );
    });
  });
});

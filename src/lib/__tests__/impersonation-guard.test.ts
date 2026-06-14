import { describe, it, expect } from "vitest";
import { isImpersonatingName } from "@/lib/impersonation-guard";

describe("isImpersonatingName", () => {
  describe("given a name impersonating the platform or support", () => {
    it.each([
      ["PLAYGROUND", "SUPPORT"],
      ["PLAYGR0UND", "SUPP0RT"], // leet 0 -> o
      ["PLAYGROUND", "SUPP0RT"],
      ["Support", "Support"],
      ["The", "Playground"],
      ["Adm1n", "Team"], // leet 1 -> i
      ["Moderation", "Officielle"],
      ["N0reply", "Service"], // leet 0 -> o
    ])("should reject %s %s", (firstName, lastName) => {
      expect(isImpersonatingName(firstName, lastName)).toBe(true);
    });
  });

  describe("given a legitimate human name", () => {
    it.each([
      ["Jean", "Dupont"],
      ["Marie", "Curie"],
      ["Авцин", "Всеволод"],
      ["Sophie", "Martin"],
      ["Lucas", "Bernard"],
    ])("should allow %s %s", (firstName, lastName) => {
      expect(isImpersonatingName(firstName, lastName)).toBe(false);
    });
  });

  it("should handle null/undefined parts safely", () => {
    expect(isImpersonatingName(null, undefined)).toBe(false);
    expect(isImpersonatingName("Support", null)).toBe(true);
  });
});

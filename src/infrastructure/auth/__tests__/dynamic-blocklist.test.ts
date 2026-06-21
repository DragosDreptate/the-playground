import { describe, expect, it } from "vitest";

import {
  matchesIdentityBlocklist,
  type DynamicBlocklist,
} from "@/infrastructure/auth/dynamic-blocklist";

const blocklist = (over: Partial<DynamicBlocklist> = {}): DynamicBlocklist => ({
  emails: [],
  oauthIds: [],
  domains: [],
  ...over,
});

describe("matchesIdentityBlocklist", () => {
  describe("given un email présent dans la surcouche dynamique", () => {
    it("should bloquer, insensible à la casse et aux espaces", () => {
      const data = blocklist({ emails: ["ln941535@mailsecondary.com"] });
      expect(
        matchesIdentityBlocklist(data, { email: "  LN941535@MailSecondary.com  " })
      ).toBe(true);
    });
  });

  describe("given un providerAccountId présent", () => {
    it("should bloquer sur correspondance exacte", () => {
      const data = blocklist({ oauthIds: ["113146911556107410982"] });
      expect(
        matchesIdentityBlocklist(data, { oauthId: "113146911556107410982" })
      ).toBe(true);
    });
  });

  describe("given une identité absente de la surcouche", () => {
    it("should ne pas bloquer", () => {
      const data = blocklist({ emails: ["someone@evil.test"] });
      expect(
        matchesIdentityBlocklist(data, {
          email: "legit@gmail.com",
          oauthId: "999",
        })
      ).toBe(false);
    });
  });

  describe("given une surcouche vide", () => {
    it("should ne jamais bloquer", () => {
      expect(
        matchesIdentityBlocklist(blocklist(), {
          email: "a@b.com",
          oauthId: "x",
        })
      ).toBe(false);
    });
  });

  describe("given une identité sans email ni oauthId", () => {
    it("should ne pas bloquer (pas de faux positif sur null)", () => {
      const data = blocklist({ emails: ["a@b.com"], oauthIds: ["x"] });
      expect(matchesIdentityBlocklist(data, {})).toBe(false);
      expect(
        matchesIdentityBlocklist(data, { email: null, oauthId: null })
      ).toBe(false);
    });
  });
});

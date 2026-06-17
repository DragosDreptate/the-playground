import { describe, it, expect } from "vitest";
import { buildSetupRedirectPath } from "@/lib/auth/post-sign-in-redirect";

describe("buildSetupRedirectPath", () => {
  describe("given no callbackUrl", () => {
    it.each([
      ["fr", "/fr/dashboard/profile/setup"],
      ["en", "/en/dashboard/profile/setup"],
    ])("should return the bare setup path for locale %s", (locale, expected) => {
      expect(buildSetupRedirectPath(locale)).toBe(expected);
    });
  });

  describe("given a callbackUrl", () => {
    it("should carry the callbackUrl in the query, url-encoded", () => {
      expect(buildSetupRedirectPath("fr", "/m/cloud-pi-native")).toBe(
        "/fr/dashboard/profile/setup?callbackUrl=%2Fm%2Fcloud-pi-native"
      );
    });

    it("should keep the locale prefix even when a callbackUrl is present", () => {
      // Invariant : le préfixe locale reste le signal de langue de l'email.
      expect(buildSetupRedirectPath("en", "/en/m/foo")).toMatch(
        /^\/en\/dashboard\/profile\/setup\?callbackUrl=/
      );
    });

    it("should fully encode a callbackUrl that itself contains a query string", () => {
      // Le param imbriqué doit être encodé pour ne pas fuiter dans la query parente.
      expect(buildSetupRedirectPath("fr", "/m/foo?ref=bar")).toBe(
        "/fr/dashboard/profile/setup?callbackUrl=%2Fm%2Ffoo%3Fref%3Dbar"
      );
    });
  });
});

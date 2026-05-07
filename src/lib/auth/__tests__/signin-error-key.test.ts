import { describe, it, expect } from "vitest";
import { mapSignInErrorToKey } from "@/lib/auth/signin-error-key";

describe("mapSignInErrorToKey", () => {
  describe("given a known SignInError type", () => {
    it.each([
      "OAuthAccountNotLinked",
      "OAuthCallbackError",
      "OAuthSignInError",
      "AccessDenied",
    ])("should return %s as is", (code) => {
      expect(mapSignInErrorToKey(code)).toBe(code);
    });
  });

  describe("given an unknown or unset code", () => {
    it.each(["Configuration", "MissingCSRF", "RandomThing", ""])(
      "should fall back to Default for %s",
      (code) => {
        expect(mapSignInErrorToKey(code)).toBe("Default");
      }
    );

    it("should fall back to Default for null", () => {
      expect(mapSignInErrorToKey(null)).toBe("Default");
    });

    it("should fall back to Default for undefined", () => {
      expect(mapSignInErrorToKey(undefined)).toBe("Default");
    });
  });
});

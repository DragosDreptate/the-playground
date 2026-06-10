import { describe, it, expect } from "vitest";
import { classifyAuthError, normalizeAuthErrorCode } from "@/lib/auth/error-kinds";

describe("classifyAuthError", () => {
  describe("given a code that occurs in normal user flows", () => {
    it.each(["Verification", "UnknownAction", "AccessDenied"])(
      "should classify %s as expected_user_flow",
      (code) => {
        expect(classifyAuthError(code)).toBe("expected_user_flow");
      }
    );
  });

  describe("given an unfamiliar or unset code", () => {
    it.each(["Configuration", "AdapterError", "JWTSessionError", "RandomThing"])(
      "should classify %s as unexpected",
      (code) => {
        expect(classifyAuthError(code)).toBe("unexpected");
      }
    );

    it("should classify null as unexpected", () => {
      expect(classifyAuthError(null)).toBe("unexpected");
    });

    it("should classify undefined as unexpected", () => {
      expect(classifyAuthError(undefined)).toBe("unexpected");
    });
  });

  describe("given a code prefixed with extra information", () => {
    it("should normalize before classifying", () => {
      expect(classifyAuthError("Verification: token expired")).toBe(
        "expected_user_flow"
      );
    });
  });
});

describe("normalizeAuthErrorCode", () => {
  describe("given a known Auth.js error code", () => {
    it.each([
      "Verification",
      "AccessDenied",
      "UnknownAction",
      "Configuration",
      "OAuthAccountNotLinked",
      "OAuthCallbackError",
      "OAuthSignInError",
      "Default",
    ])("should keep %s as-is", (code) => {
      expect(normalizeAuthErrorCode(code)).toBe(code);
    });

    it("should strip extra information after the colon", () => {
      expect(normalizeAuthErrorCode("Verification: token expired")).toBe(
        "Verification"
      );
    });
  });

  describe("given a user-controlled or unset value", () => {
    it.each([
      "CredentialsSignin",
      "<script>alert(1)</script>",
      "x".repeat(300),
    ])("should bucket %s under Unknown to bound Sentry tag cardinality", (code) => {
      expect(normalizeAuthErrorCode(code)).toBe("Unknown");
    });

    it("should return Unknown for null", () => {
      expect(normalizeAuthErrorCode(null)).toBe("Unknown");
    });

    it("should return Unknown for undefined", () => {
      expect(normalizeAuthErrorCode(undefined)).toBe("Unknown");
    });
  });
});

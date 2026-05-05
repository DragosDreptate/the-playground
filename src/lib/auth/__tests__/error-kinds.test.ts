import { describe, it, expect } from "vitest";
import { classifyAuthError } from "@/lib/auth/error-kinds";

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

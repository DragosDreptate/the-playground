import { describe, it, expect } from "vitest";
import { isBypassTokenValid, timingSafeEqual } from "../maintenance";

describe("timingSafeEqual", () => {
  it("should return true for identical strings", () => {
    expect(timingSafeEqual("s3cr3t-token", "s3cr3t-token")).toBe(true);
  });

  it("should return false for different strings of equal length", () => {
    expect(timingSafeEqual("s3cr3t-token", "s3cr3t-tokeN")).toBe(false);
  });

  it("should return false for strings of different length", () => {
    expect(timingSafeEqual("token", "token-longer")).toBe(false);
    expect(timingSafeEqual("token-longer", "token")).toBe(false);
  });

  it("should return true for two empty strings", () => {
    expect(timingSafeEqual("", "")).toBe(true);
  });
});

describe("isBypassTokenValid", () => {
  const expected = "the-real-bypass-token";

  describe("given a matching token", () => {
    it("should grant the bypass", () => {
      expect(isBypassTokenValid(expected, expected)).toBe(true);
    });
  });

  describe("given a non-matching token", () => {
    it("should refuse the bypass", () => {
      expect(isBypassTokenValid("wrong-token", expected)).toBe(false);
    });
  });

  describe("given a missing provided or expected value", () => {
    it.each([
      ["provided undefined", undefined, expected],
      ["provided null", null, expected],
      ["provided empty", "", expected],
      ["expected undefined", expected, undefined],
      ["expected null", expected, null],
      ["expected empty (misconfigured secret)", expected, ""],
      ["both empty", "", ""],
    ])("should refuse the bypass (%s)", (_label, provided, configured) => {
      expect(isBypassTokenValid(provided, configured)).toBe(false);
    });
  });
});

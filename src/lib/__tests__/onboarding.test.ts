import { describe, it, expect } from "vitest";
import { shouldRedirectToSetup, shouldRedirectFromSetup } from "@/lib/onboarding";

describe("Onboarding routing guards", () => {
  // ─── shouldRedirectToSetup (protected pages) ────────────────

  describe("shouldRedirectToSetup", () => {
    it.each([
      {
        desc: "non-onboarded user",
        user: { id: "u1", onboardingCompleted: false },
        expected: true,
      },
      {
        desc: "onboarded user",
        user: { id: "u1", onboardingCompleted: true },
        expected: false,
      },
      {
        desc: "null user (unauthenticated)",
        user: null,
        expected: false,
      },
      {
        desc: "undefined user",
        user: undefined,
        expected: false,
      },
    ])(
      "given $desc, should return $expected",
      ({ user, expected }) => {
        expect(shouldRedirectToSetup(user)).toBe(expected);
      }
    );
  });

  // ─── shouldRedirectFromSetup (setup page) ───────────────────

  describe("shouldRedirectFromSetup", () => {
    it.each([
      {
        desc: "onboarded user",
        user: { id: "u1", onboardingCompleted: true },
        expected: true,
      },
      {
        desc: "non-onboarded user",
        user: { id: "u1", onboardingCompleted: false },
        expected: false,
      },
      {
        desc: "null user (unauthenticated)",
        user: null,
        expected: false,
      },
      {
        desc: "undefined user",
        user: undefined,
        expected: false,
      },
    ])(
      "given $desc, should return $expected",
      ({ user, expected }) => {
        expect(shouldRedirectFromSetup(user)).toBe(expected);
      }
    );
  });

  // ─── Infinite redirect loop prevention ──────────────────────

  describe("redirect loop prevention", () => {
    it("should not create an infinite loop for a non-onboarded user", () => {
      const user = { id: "u1", onboardingCompleted: false };

      // Step 1: User hits /dashboard (protected page)
      // → (main)/layout guard fires
      const redirectsToSetup = shouldRedirectToSetup(user);
      expect(redirectsToSetup).toBe(true);

      // Step 2: User arrives at /dashboard/profile/setup
      // → setup page guard fires
      const redirectsFromSetup = shouldRedirectFromSetup(user);
      expect(redirectsFromSetup).toBe(false);

      // ✓ User stays on setup page — no loop
    });

    it("should not create an infinite loop for an onboarded user", () => {
      const user = { id: "u1", onboardingCompleted: true };

      // Step 1: User hits /dashboard/profile/setup directly
      // → setup page guard fires
      const redirectsFromSetup = shouldRedirectFromSetup(user);
      expect(redirectsFromSetup).toBe(true);

      // Step 2: User arrives at /dashboard (protected page)
      // → (main)/layout guard fires
      const redirectsToSetup = shouldRedirectToSetup(user);
      expect(redirectsToSetup).toBe(false);

      // ✓ User stays on dashboard — no loop
    });

    it("should guarantee exactly one stable destination per state", () => {
      const nonOnboarded = { id: "u1", onboardingCompleted: false };
      const onboarded = { id: "u1", onboardingCompleted: true };

      // Non-onboarded: protected pages redirect, setup page does not
      expect(shouldRedirectToSetup(nonOnboarded)).toBe(true);
      expect(shouldRedirectFromSetup(nonOnboarded)).toBe(false);

      // Onboarded: setup page redirects, protected pages do not
      expect(shouldRedirectToSetup(onboarded)).toBe(false);
      expect(shouldRedirectFromSetup(onboarded)).toBe(true);

      // The two guards must NEVER both be true for the same user state
      // (that would mean every page redirects → infinite loop)
      expect(
        shouldRedirectToSetup(nonOnboarded) && shouldRedirectFromSetup(nonOnboarded)
      ).toBe(false);
      expect(
        shouldRedirectToSetup(onboarded) && shouldRedirectFromSetup(onboarded)
      ).toBe(false);
    });
  });
});

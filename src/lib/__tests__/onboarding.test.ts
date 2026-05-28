import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  shouldRedirectToSetup,
  shouldRedirectFromSetup,
  buildOnboardingSetupUrl,
  handleOnboardingRequired,
} from "@/lib/onboarding";

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

  // ─── buildOnboardingSetupUrl ────────────────────────────────

  describe("buildOnboardingSetupUrl", () => {
    function stubLocation(pathname: string, search = "") {
      vi.stubGlobal("window", { location: { pathname, search } });
    }

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("encode le chemin courant en callbackUrl", () => {
      stubLocation("/fr/m/some-event");
      expect(buildOnboardingSetupUrl()).toBe(
        "/dashboard/profile/setup?callbackUrl=%2Ffr%2Fm%2Fsome-event",
      );
    });

    it("préserve la query string courante dans le callbackUrl", () => {
      stubLocation("/fr/circles/spark", "?tab=members");
      expect(buildOnboardingSetupUrl()).toBe(
        "/dashboard/profile/setup?callbackUrl=%2Ffr%2Fcircles%2Fspark%3Ftab%3Dmembers",
      );
    });
  });

  // ─── handleOnboardingRequired ───────────────────────────────

  describe("handleOnboardingRequired", () => {
    let push: ReturnType<typeof vi.fn<(url: string) => void>>;

    beforeEach(() => {
      push = vi.fn<(url: string) => void>();
      vi.stubGlobal("window", { location: { pathname: "/fr/m/x", search: "" } });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("retourne false et n'appelle pas push sur succès", () => {
      const handled = handleOnboardingRequired({ success: true }, { push });
      expect(handled).toBe(false);
      expect(push).not.toHaveBeenCalled();
    });

    it("retourne false et n'appelle pas push pour un autre code d'erreur", () => {
      const handled = handleOnboardingRequired(
        { success: false, code: "UNAUTHORIZED" },
        { push },
      );
      expect(handled).toBe(false);
      expect(push).not.toHaveBeenCalled();
    });

    it("redirige vers setup et retourne true sur ONBOARDING_REQUIRED", () => {
      const handled = handleOnboardingRequired(
        { success: false, code: "ONBOARDING_REQUIRED" },
        { push },
      );
      expect(handled).toBe(true);
      expect(push).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledWith(
        "/dashboard/profile/setup?callbackUrl=%2Ffr%2Fm%2Fx",
      );
    });

    it("appelle le callback au lieu de rediriger quand onRequired est fourni", () => {
      const onRequired = vi.fn();
      const handled = handleOnboardingRequired(
        { success: false, code: "ONBOARDING_REQUIRED" },
        { push },
        { onRequired },
      );

      expect(handled).toBe(true);
      expect(onRequired).toHaveBeenCalledTimes(1);
      expect(push).not.toHaveBeenCalled();
    });
  });
});

/**
 * Tests — Logique de redirection du dashboard (lib/dashboard.ts)
 *
 * La règle métier : un utilisateur sans activité (aucun Circle, aucun événement
 * à venir, aucun événement passé) est redirigé vers /dashboard/welcome.
 *
 * Cette logique est extraite de DashboardContent (composant Next.js async)
 * sous forme de fonction pure testable en isolation, suivant le même patron
 * que lib/onboarding.ts (shouldRedirectToSetup / shouldRedirectFromSetup).
 */

import { describe, it, expect } from "vitest";
import { shouldRedirectToWelcome } from "@/lib/dashboard";

describe("shouldRedirectToWelcome", () => {
  // ─────────────────────────────────────────────────────────────
  // Cas : utilisateur sans aucune activité → redirection welcome
  // ─────────────────────────────────────────────────────────────

  describe("given a brand-new user with no activity at all", () => {
    it("should redirect to welcome when all counts are zero", () => {
      expect(
        shouldRedirectToWelcome({
          circleCount: 0,
          upcomingMomentCount: 0,
          pastMomentCount: 0,
        })
      ).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Cas : activité suffit à éviter la redirection welcome
  // ─────────────────────────────────────────────────────────────

  describe("given a user with at least one Circle", () => {
    it("should NOT redirect to welcome when the user belongs to a Circle", () => {
      expect(
        shouldRedirectToWelcome({
          circleCount: 1,
          upcomingMomentCount: 0,
          pastMomentCount: 0,
        })
      ).toBe(false);
    });

    it("should NOT redirect to welcome when the user belongs to several Circles", () => {
      expect(
        shouldRedirectToWelcome({
          circleCount: 5,
          upcomingMomentCount: 0,
          pastMomentCount: 0,
        })
      ).toBe(false);
    });
  });

  describe("given a user with upcoming Moment registrations", () => {
    it("should NOT redirect to welcome when the user has an upcoming Moment", () => {
      expect(
        shouldRedirectToWelcome({
          circleCount: 0,
          upcomingMomentCount: 1,
          pastMomentCount: 0,
        })
      ).toBe(false);
    });
  });

  describe("given a user with past Moment registrations", () => {
    it("should NOT redirect to welcome when the user has a past Moment", () => {
      expect(
        shouldRedirectToWelcome({
          circleCount: 0,
          upcomingMomentCount: 0,
          pastMomentCount: 1,
        })
      ).toBe(false);
    });
  });

  describe("given a user with all types of activity", () => {
    it("should NOT redirect to welcome when the user has Circles and Moments", () => {
      expect(
        shouldRedirectToWelcome({
          circleCount: 2,
          upcomingMomentCount: 3,
          pastMomentCount: 5,
        })
      ).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Spécification par l'exemple — table de vérité exhaustive
  //
  // La règle est : redirect ⟺ (circles = 0 AND upcoming = 0 AND past = 0)
  // ─────────────────────────────────────────────────────────────

  describe("exhaustive truth table — redirect only when all three are zero", () => {
    it.each([
      // ─── Un seul signal suffit à éviter la redirection ────────
      {
        label: "only circles > 0",
        circleCount: 1,
        upcomingMomentCount: 0,
        pastMomentCount: 0,
        expected: false,
      },
      {
        label: "only upcomingMoments > 0",
        circleCount: 0,
        upcomingMomentCount: 1,
        pastMomentCount: 0,
        expected: false,
      },
      {
        label: "only pastMoments > 0",
        circleCount: 0,
        upcomingMomentCount: 0,
        pastMomentCount: 1,
        expected: false,
      },
      {
        label: "circles + upcomingMoments > 0",
        circleCount: 1,
        upcomingMomentCount: 2,
        pastMomentCount: 0,
        expected: false,
      },
      {
        label: "circles + pastMoments > 0",
        circleCount: 1,
        upcomingMomentCount: 0,
        pastMomentCount: 3,
        expected: false,
      },
      {
        label: "upcomingMoments + pastMoments > 0",
        circleCount: 0,
        upcomingMomentCount: 1,
        pastMomentCount: 1,
        expected: false,
      },
      {
        label: "all three > 0",
        circleCount: 2,
        upcomingMomentCount: 4,
        pastMomentCount: 6,
        expected: false,
      },
      // ─── L'unique cas qui déclenche la redirection ────────────
      {
        label: "all three = 0 (brand-new user)",
        circleCount: 0,
        upcomingMomentCount: 0,
        pastMomentCount: 0,
        expected: true,
      },
    ])(
      "given $label: should return $expected",
      ({ circleCount, upcomingMomentCount, pastMomentCount, expected }) => {
        expect(
          shouldRedirectToWelcome({ circleCount, upcomingMomentCount, pastMomentCount })
        ).toBe(expected);
      }
    );
  });
});

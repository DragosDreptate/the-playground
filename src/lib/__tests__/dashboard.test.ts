/**
 * Tests — Logique de redirection du dashboard (lib/dashboard.ts)
 *
 * Règle métier mise à jour : un utilisateur est redirigé vers /dashboard/welcome
 * UNIQUEMENT si :
 *   1. Il n'a pas encore choisi un mode (dashboardMode === null)
 *   2. ET il n'a aucune activité (aucun Circle, aucun Moment à venir ni passé)
 *
 * Un utilisateur avec un mode déjà défini n'est jamais redirigé vers welcome,
 * même s'il n'a pas encore d'activité.
 */

import { describe, it, expect } from "vitest";
import { shouldRedirectToWelcome } from "@/lib/dashboard";

describe("shouldRedirectToWelcome", () => {
  // ─────────────────────────────────────────────────────────────
  // Cas : nouvel utilisateur sans mode ni activité → redirection welcome
  // ─────────────────────────────────────────────────────────────

  describe("given a brand-new user with no mode and no activity", () => {
    it("should redirect to welcome when dashboardMode is null and all counts are zero", () => {
      expect(
        shouldRedirectToWelcome({
          dashboardMode: null,
          circleCount: 0,
          upcomingMomentCount: 0,
          pastMomentCount: 0,
        })
      ).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Cas : mode déjà défini → jamais de redirection welcome
  // ─────────────────────────────────────────────────────────────

  describe("given a user who has already chosen a dashboard mode", () => {
    it("should NOT redirect to welcome when mode is PARTICIPANT and no activity", () => {
      expect(
        shouldRedirectToWelcome({
          dashboardMode: "PARTICIPANT",
          circleCount: 0,
          upcomingMomentCount: 0,
          pastMomentCount: 0,
        })
      ).toBe(false);
    });

    it("should NOT redirect to welcome when mode is ORGANIZER and no activity", () => {
      expect(
        shouldRedirectToWelcome({
          dashboardMode: "ORGANIZER",
          circleCount: 0,
          upcomingMomentCount: 0,
          pastMomentCount: 0,
        })
      ).toBe(false);
    });

    it("should NOT redirect to welcome when mode is set and has activity", () => {
      expect(
        shouldRedirectToWelcome({
          dashboardMode: "PARTICIPANT",
          circleCount: 2,
          upcomingMomentCount: 3,
          pastMomentCount: 5,
        })
      ).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Cas : activité suffit à éviter la redirection welcome (même sans mode)
  // ─────────────────────────────────────────────────────────────

  describe("given a user with at least one Circle (no mode set)", () => {
    it("should NOT redirect to welcome when the user belongs to a Circle", () => {
      expect(
        shouldRedirectToWelcome({
          dashboardMode: null,
          circleCount: 1,
          upcomingMomentCount: 0,
          pastMomentCount: 0,
        })
      ).toBe(false);
    });

    it("should NOT redirect to welcome when the user belongs to several Circles", () => {
      expect(
        shouldRedirectToWelcome({
          dashboardMode: null,
          circleCount: 5,
          upcomingMomentCount: 0,
          pastMomentCount: 0,
        })
      ).toBe(false);
    });
  });

  describe("given a user with upcoming Moment registrations (no mode set)", () => {
    it("should NOT redirect to welcome when the user has an upcoming Moment", () => {
      expect(
        shouldRedirectToWelcome({
          dashboardMode: null,
          circleCount: 0,
          upcomingMomentCount: 1,
          pastMomentCount: 0,
        })
      ).toBe(false);
    });
  });

  describe("given a user with past Moment registrations (no mode set)", () => {
    it("should NOT redirect to welcome when the user has a past Moment", () => {
      expect(
        shouldRedirectToWelcome({
          dashboardMode: null,
          circleCount: 0,
          upcomingMomentCount: 0,
          pastMomentCount: 1,
        })
      ).toBe(false);
    });
  });

  describe("given a user with all types of activity (no mode set)", () => {
    it("should NOT redirect to welcome when the user has Circles and Moments", () => {
      expect(
        shouldRedirectToWelcome({
          dashboardMode: null,
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
  // La règle est : redirect ⟺ (mode === null AND circles = 0 AND upcoming = 0 AND past = 0)
  // ─────────────────────────────────────────────────────────────

  describe("exhaustive truth table", () => {
    it.each([
      // ─── Mode défini → jamais de redirect ─────────────────────
      {
        label: "mode=PARTICIPANT, all counts = 0",
        dashboardMode: "PARTICIPANT" as const,
        circleCount: 0,
        upcomingMomentCount: 0,
        pastMomentCount: 0,
        expected: false,
      },
      {
        label: "mode=ORGANIZER, all counts = 0",
        dashboardMode: "ORGANIZER" as const,
        circleCount: 0,
        upcomingMomentCount: 0,
        pastMomentCount: 0,
        expected: false,
      },
      // ─── Activité suffit à éviter le redirect (mode=null) ─────
      {
        label: "mode=null, only circles > 0",
        dashboardMode: null,
        circleCount: 1,
        upcomingMomentCount: 0,
        pastMomentCount: 0,
        expected: false,
      },
      {
        label: "mode=null, only upcomingMoments > 0",
        dashboardMode: null,
        circleCount: 0,
        upcomingMomentCount: 1,
        pastMomentCount: 0,
        expected: false,
      },
      {
        label: "mode=null, only pastMoments > 0",
        dashboardMode: null,
        circleCount: 0,
        upcomingMomentCount: 0,
        pastMomentCount: 1,
        expected: false,
      },
      {
        label: "mode=null, circles + upcomingMoments > 0",
        dashboardMode: null,
        circleCount: 1,
        upcomingMomentCount: 2,
        pastMomentCount: 0,
        expected: false,
      },
      {
        label: "mode=null, circles + pastMoments > 0",
        dashboardMode: null,
        circleCount: 1,
        upcomingMomentCount: 0,
        pastMomentCount: 3,
        expected: false,
      },
      {
        label: "mode=null, upcomingMoments + pastMoments > 0",
        dashboardMode: null,
        circleCount: 0,
        upcomingMomentCount: 1,
        pastMomentCount: 1,
        expected: false,
      },
      {
        label: "mode=null, all three > 0",
        dashboardMode: null,
        circleCount: 2,
        upcomingMomentCount: 4,
        pastMomentCount: 6,
        expected: false,
      },
      // ─── L'unique cas qui déclenche la redirection ────────────
      {
        label: "mode=null, all three = 0 (brand-new user)",
        dashboardMode: null,
        circleCount: 0,
        upcomingMomentCount: 0,
        pastMomentCount: 0,
        expected: true,
      },
    ])(
      "given $label: should return $expected",
      ({ dashboardMode, circleCount, upcomingMomentCount, pastMomentCount, expected }) => {
        expect(
          shouldRedirectToWelcome({ dashboardMode, circleCount, upcomingMomentCount, pastMomentCount })
        ).toBe(expected);
      }
    );
  });
});

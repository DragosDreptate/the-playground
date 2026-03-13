import { describe, it, expect } from "vitest";
import {
  calculateCircleScore,
  calculateMomentScore,
  type CircleScoreInput,
  type MomentScoreInput,
} from "../explorer-score.service";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Date antérieure à 2 jours — satisfait la condition ageInDays >= 1. */
const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

/** Date d'il y a 30 minutes — ne satisfait PAS ageInDays >= 1. */
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

/** Input Circle de base : tous les signaux binaires à false/null, quantitatifs à 0. */
function baseCircleInput(
  overrides: Partial<CircleScoreInput> = {}
): CircleScoreInput {
  return {
    description: "",
    coverImage: null,
    category: null,
    createdAt: twoDaysAgo,
    isDemo: false,
    overrideScore: null,
    memberCount: 0,
    pastEventCount: 0,
    hasPastEventWithRegistrant: false,
    hasUpcomingEvent: false,
    ...overrides,
  };
}

/** Input Moment de base : tous les signaux à leur valeur minimale. */
function baseMomentInput(
  overrides: Partial<MomentScoreInput> = {}
): MomentScoreInput {
  return {
    description: "",
    coverImage: null,
    locationName: null,
    registrantCount: 0,
    circleScore: 0,
    circleIsDemo: false,
    ...overrides,
  };
}

// ─── calculateCircleScore ────────────────────────────────────────────────────

describe("calculateCircleScore", () => {
  // ── Cas concrets de la spec ──────────────────────────────────────────────

  describe("given a well-crafted new community (0 members, 1 upcoming event)", () => {
    it("should return score 27", () => {
      const input = baseCircleInput({
        coverImage: "https://example.com/cover.jpg",
        hasUpcomingEvent: true,
        description: "Une communauté dédiée aux passionnés de tech parisiens.",
        category: "tech",
        // createdAt = twoDaysAgo → ageInDays >= 1 ✓
        // raw = 18 + 15 + 10 + 7 + 5 = 55 → round(55/205*100) = 27
      });

      expect(calculateCircleScore(input)).toBe(27);
    });
  });

  describe("given a community with 3 members, cover, 1 past event, 1 upcoming", () => {
    it("should return score 48", () => {
      const input = baseCircleInput({
        coverImage: "https://example.com/cover.jpg",
        hasPastEventWithRegistrant: true,
        hasUpcomingEvent: true,
        category: "tech",
        // pas de description longue
        description: "Court.",
        memberCount: 3,
        pastEventCount: 1,
        // raw = 20 + 18 + 15 + 7 + 5 + (3*8=24) + (1*10=10) = 99
        // round(99/205*100) = round(48.29) = 48
      });

      expect(calculateCircleScore(input)).toBe(48);
    });
  });

  describe("given an established community with 10 members, 5 past events, all signals checked", () => {
    it("should return score 100", () => {
      const input = baseCircleInput({
        coverImage: "https://example.com/cover.jpg",
        hasPastEventWithRegistrant: true,
        hasUpcomingEvent: true,
        description: "Une communauté très active avec de nombreux événements.",
        category: "sport",
        memberCount: 10,
        pastEventCount: 5,
        // raw = 20 + 18 + 15 + 10 + 7 + 5 + 80 + 50 = 205
        // round(205/205*100) = 100
      });

      expect(calculateCircleScore(input)).toBe(100);
    });
  });

  // ── Override score ───────────────────────────────────────────────────────

  describe("given overrideScore is set", () => {
    it("should return overrideScore regardless of other inputs", () => {
      const input = baseCircleInput({
        overrideScore: 90,
        // tous les autres signaux à 0 / null
      });

      expect(calculateCircleScore(input)).toBe(90);
    });

    it("should return overrideScore 0 when explicitly set to 0", () => {
      const input = baseCircleInput({
        overrideScore: 0,
        coverImage: "https://example.com/cover.jpg",
        memberCount: 10,
      });

      expect(calculateCircleScore(input)).toBe(0);
    });
  });

  // ── Communautés démo ─────────────────────────────────────────────────────

  describe("given a demo community (isDemo = true)", () => {
    it("should cap score at 30 even when raw score would yield ~90/100", () => {
      // Score brut élevé : tout coché, 8 membres, 4 events passés
      // raw = 20+18+15+10+7+5+(8*8=64)+(4*10=40) = 179
      // round(179/205*100) = round(87.3) = 87 → capé à 30
      const input = baseCircleInput({
        isDemo: true,
        coverImage: "https://example.com/cover.jpg",
        hasPastEventWithRegistrant: true,
        hasUpcomingEvent: true,
        description: "Une communauté démo bien remplie pour les tests.",
        category: "design",
        memberCount: 8,
        pastEventCount: 4,
      });

      expect(calculateCircleScore(input)).toBe(30);
    });

    it("should not cap if the calculated score is already below 30", () => {
      // raw = 5 (ageInDays only) → round(5/205*100) = round(2.4) = 2
      const input = baseCircleInput({
        isDemo: true,
        hasUpcomingEvent: false,
        memberCount: 0,
        pastEventCount: 0,
      });

      expect(calculateCircleScore(input)).toBe(2);
    });
  });

  // ── Signaux binaires ─────────────────────────────────────────────────────

  describe("given binary signals", () => {
    it("should add 20 pts for hasPastEventWithRegistrant", () => {
      const without = calculateCircleScore(
        baseCircleInput({ createdAt: thirtyMinutesAgo })
      );
      const with_ = calculateCircleScore(
        baseCircleInput({
          hasPastEventWithRegistrant: true,
          createdAt: thirtyMinutesAgo,
        })
      );
      // Δ en score brut = 20 → Δ normalisé ≈ round(20/205*100) = 10
      expect(with_ - without).toBe(10);
    });

    it("should add 18 pts for cover image", () => {
      const without = calculateCircleScore(
        baseCircleInput({ createdAt: thirtyMinutesAgo })
      );
      const with_ = calculateCircleScore(
        baseCircleInput({
          coverImage: "https://example.com/cover.jpg",
          createdAt: thirtyMinutesAgo,
        })
      );
      // Δ brut = 18 → round(18/205*100) = 9
      expect(with_ - without).toBe(9);
    });

    it("should not award ageInDays bonus for a community created less than 1 day ago", () => {
      const input = baseCircleInput({
        createdAt: thirtyMinutesAgo,
        hasUpcomingEvent: true, // pour qu'elle soit éligible Explorer
      });
      // raw sans âge = 15; round(15/205*100) = 7
      expect(calculateCircleScore(input)).toBe(7);
    });

    it("should award ageInDays bonus for a community created more than 1 day ago", () => {
      const input = baseCircleInput({
        createdAt: twoDaysAgo,
        hasUpcomingEvent: true,
      });
      // raw = 15 + 5 = 20; round(20/205*100) = 10
      expect(calculateCircleScore(input)).toBe(10);
    });
  });

  // ── Caps quantitatifs ────────────────────────────────────────────────────

  describe("given quantitative signals caps", () => {
    it("should cap member score at 80 pts (≥ 10 members)", () => {
      const at10 = calculateCircleScore(
        baseCircleInput({ memberCount: 10, createdAt: thirtyMinutesAgo })
      );
      const at20 = calculateCircleScore(
        baseCircleInput({ memberCount: 20, createdAt: thirtyMinutesAgo })
      );
      // Les deux doivent avoir le même score (cap atteint)
      expect(at10).toBe(at20);
    });

    it("should cap past events score at 50 pts (≥ 5 past events)", () => {
      const at5 = calculateCircleScore(
        baseCircleInput({ pastEventCount: 5, createdAt: thirtyMinutesAgo })
      );
      const at10 = calculateCircleScore(
        baseCircleInput({ pastEventCount: 10, createdAt: thirtyMinutesAgo })
      );
      expect(at5).toBe(at10);
    });

    it("should scale member score linearly before the cap", () => {
      const at0 = calculateCircleScore(
        baseCircleInput({ memberCount: 0, createdAt: thirtyMinutesAgo })
      );
      const at5 = calculateCircleScore(
        baseCircleInput({ memberCount: 5, createdAt: thirtyMinutesAgo })
      );
      // Δ brut = 5*8 = 40 → round(40/205*100) = 20
      expect(at5 - at0).toBe(20);
    });
  });
});

// ─── calculateMomentScore ────────────────────────────────────────────────────

describe("calculateMomentScore", () => {
  // ── Cas concret spec ────────────────────────────────────────────────────

  describe("given an event with 10 registrants, cover, description, location, circle score 80", () => {
    it("should return score 90", () => {
      const input = baseMomentInput({
        registrantCount: 10,
        coverImage: "https://example.com/cover.jpg",
        description: "Un atelier intensif sur React 19 et les nouvelles API.",
        locationName: "Paris 11e",
        circleScore: 80,
        // moment_raw = min(10*7, 70) + 15 + 10 + 5 = 70 + 15 + 10 + 5 = 100
        // score = round(80*0.5 + 100*0.5) = round(40 + 50) = 90
      });

      expect(calculateMomentScore(input)).toBe(90);
    });
  });

  // ── Communauté démo ──────────────────────────────────────────────────────

  describe("given an event in a demo circle (circleIsDemo = true)", () => {
    it("should cap the moment score at 30", () => {
      const input = baseMomentInput({
        registrantCount: 10,
        coverImage: "https://example.com/cover.jpg",
        description: "Un super événement de démonstration bien rempli.",
        locationName: "Paris",
        circleScore: 80,
        circleIsDemo: true,
        // score non capé = 90 → capé à 30
      });

      expect(calculateMomentScore(input)).toBe(30);
    });

    it("should not cap if the score is already below 30", () => {
      const input = baseMomentInput({
        registrantCount: 0,
        circleScore: 10,
        circleIsDemo: true,
        // moment_raw = 0; score = round(10*0.5 + 0*0.5) = 5
      });

      expect(calculateMomentScore(input)).toBe(5);
    });
  });

  // ── Caps quantitatifs ────────────────────────────────────────────────────

  describe("given registrant count cap", () => {
    it("should cap registrant contribution at 70 pts (≥ 10 registrants)", () => {
      const at10 = calculateMomentScore(
        baseMomentInput({ registrantCount: 10, circleScore: 0 })
      );
      const at20 = calculateMomentInput({ registrantCount: 20, circleScore: 0 });
      // Les deux doivent avoir le même score sur le signal inscrits
      expect(at10).toBe(at20);
    });

    it("should scale registrant score linearly before the cap", () => {
      const at0 = calculateMomentScore(
        baseMomentInput({ registrantCount: 0, circleScore: 0 })
      );
      const at5 = calculateMomentScore(
        baseMomentInput({ registrantCount: 5, circleScore: 0 })
      );
      // moment_raw avec 5 inscrits = 5*7 = 35 → score = round(0*0.5 + 35*0.5) = round(17.5) = 18
      expect(at5 - at0).toBe(18);
    });
  });

  // ── Couplage Circle ──────────────────────────────────────────────────────

  describe("given circle score coupling (50/50)", () => {
    it("should give 50% weight to circle score", () => {
      const lowCircle = calculateMomentScore(
        baseMomentInput({ circleScore: 0, registrantCount: 0 })
      );
      const highCircle = calculateMomentScore(
        baseMomentInput({ circleScore: 100, registrantCount: 0 })
      );
      // score_low = round(0*0.5 + 0) = 0
      // score_high = round(100*0.5 + 0) = 50
      expect(highCircle - lowCircle).toBe(50);
    });
  });

  // ── Signaux binaires ─────────────────────────────────────────────────────

  describe("given binary moment signals", () => {
    it("should add cover signal contribution", () => {
      const without = calculateMomentScore(
        baseMomentInput({ circleScore: 0 })
      );
      const with_ = calculateMomentScore(
        baseMomentInput({
          circleScore: 0,
          coverImage: "https://example.com/cover.jpg",
        })
      );
      // moment_raw Δ = 15 → score Δ = round(15*0.5) = round(7.5) = 8
      expect(with_ - without).toBe(8);
    });

    it("should add location signal contribution", () => {
      const without = calculateMomentScore(
        baseMomentInput({ circleScore: 0 })
      );
      const with_ = calculateMomentScore(
        baseMomentInput({ circleScore: 0, locationName: "Paris" })
      );
      // moment_raw Δ = 5 → score Δ = round(5*0.5) = round(2.5) = 3
      expect(with_ - without).toBe(3);
    });

    it("should add description signal contribution", () => {
      const shortDesc = calculateMomentScore(
        baseMomentInput({ circleScore: 0, description: "Court." })
      );
      const longDesc = calculateMomentScore(
        baseMomentInput({
          circleScore: 0,
          description: "Une description suffisamment longue pour passer le seuil.",
        })
      );
      // moment_raw Δ = 10 → score Δ = round(10*0.5) = 5
      expect(longDesc - shortDesc).toBe(5);
    });
  });
});

// ─── Helper pour les tests de cap (évite la répétition) ─────────────────────

function calculateMomentInput(overrides: Partial<MomentScoreInput>): number {
  return calculateMomentScore(baseMomentInput(overrides));
}

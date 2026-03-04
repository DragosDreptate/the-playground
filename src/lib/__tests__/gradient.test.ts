import { describe, it, expect } from "vitest";
import { getMomentGradient } from "@/lib/gradient";

/**
 * Tests — getMomentGradient (lib/gradient.ts)
 *
 * Règle métier : chaque Moment se voit attribuer un gradient déterministe
 * à partir de son slug (seed). Le même slug produit toujours le même gradient.
 * Les gradients tournent parmi 8 options possibles.
 */

describe("getMomentGradient", () => {
  // ─────────────────────────────────────────────────────────────
  // Format de sortie
  // ─────────────────────────────────────────────────────────────

  describe("given any seed", () => {
    it("should return a string starting with 'linear-gradient'", () => {
      const result = getMomentGradient("test-event");
      expect(result).toMatch(/^linear-gradient/);
    });

    it("should return a non-empty string", () => {
      expect(getMomentGradient("some-slug")).toBeTruthy();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Déterminisme — même entrée = même sortie
  // ─────────────────────────────────────────────────────────────

  describe("given the same seed called multiple times", () => {
    it("should return the same gradient every time", () => {
      const seed = "paris-tech-meetup";
      const first = getMomentGradient(seed);
      const second = getMomentGradient(seed);
      const third = getMomentGradient(seed);
      expect(first).toBe(second);
      expect(second).toBe(third);
    });

    it.each([
      "weekly-yoga",
      "hackathon-2026",
      "apero-js-12",
      "soiree-design-thinking",
      "conference-ia-generative",
    ])(
      "should return a consistent gradient for seed '%s'",
      (seed) => {
        expect(getMomentGradient(seed)).toBe(getMomentGradient(seed));
      }
    );
  });

  // ─────────────────────────────────────────────────────────────
  // Distribution — différentes entrées peuvent donner différents gradients
  // ─────────────────────────────────────────────────────────────

  describe("given multiple different seeds", () => {
    it("should not always return the same gradient for different seeds", () => {
      const seeds = [
        "event-a",
        "event-b",
        "event-c",
        "event-d",
        "event-e",
        "event-f",
        "event-g",
        "event-h",
        "event-i",
        "event-j",
      ];
      const gradients = new Set(seeds.map((s) => getMomentGradient(s)));
      // Avec 10 seeds et 8 gradients, au moins 2 gradients distincts doivent apparaître
      expect(gradients.size).toBeGreaterThan(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Cas limites — chaîne vide
  // ─────────────────────────────────────────────────────────────

  describe("given an empty seed", () => {
    it("should return the first gradient as fallback", () => {
      const result = getMomentGradient("");
      expect(result).toMatch(/^linear-gradient/);
      // Le fallback est défini comme GRADIENTS[0] dans le code source
      expect(result).toContain("#7c3aed");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Les gradients produits restent dans la liste des 8 gradients définis
  // ─────────────────────────────────────────────────────────────

  describe("given any seed", () => {
    const knownGradients = [
      "linear-gradient(135deg, #7c3aed, #4f46e5)",
      "linear-gradient(135deg, #06b6d4, #2563eb)",
      "linear-gradient(135deg, #f43f5e, #a21caf)",
      "linear-gradient(135deg, #10b981, #0891b2)",
      "linear-gradient(135deg, #d946ef, #7c3aed)",
      "linear-gradient(135deg, #f59e0b, #e11d48)",
      "linear-gradient(135deg, #14b8a6, #4f46e5)",
      "linear-gradient(135deg, #6366f1, #0284c7)",
    ];

    it.each(["slug-1", "slug-2", "yoga", "tech", "design", "sport", "art", "science"])(
      "should return one of the 8 known gradients for seed '%s'",
      (seed) => {
        expect(knownGradients).toContain(getMomentGradient(seed));
      }
    );
  });
});

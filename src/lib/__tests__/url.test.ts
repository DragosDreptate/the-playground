import { describe, it, expect } from "vitest";
import { safeCallbackUrl } from "@/lib/url";

/**
 * Tests — safeCallbackUrl (lib/url.ts)
 *
 * Règle métier : empêcher les open redirects.
 * Seules les URLs relatives commençant par "/" (mais pas "//") sont autorisées.
 * Toute URL absolue ou ambiguë (protocole relatif) est rejetée.
 */

describe("safeCallbackUrl", () => {
  // ─────────────────────────────────────────────────────────────
  // URLs valides — chemins relatifs internes
  // ─────────────────────────────────────────────────────────────

  describe("given a valid relative path starting with /", () => {
    it("should return the path unchanged for a simple path", () => {
      expect(safeCallbackUrl("/dashboard")).toBe("/dashboard");
    });

    it("should return the path unchanged for a nested path", () => {
      expect(safeCallbackUrl("/fr/m/my-event-slug")).toBe("/fr/m/my-event-slug");
    });

    it("should return the path unchanged for a path with query string", () => {
      expect(safeCallbackUrl("/dashboard?mode=organizer")).toBe(
        "/dashboard?mode=organizer"
      );
    });

    it("should return the path unchanged for a path with hash", () => {
      expect(safeCallbackUrl("/circles/my-circle#members")).toBe(
        "/circles/my-circle#members"
      );
    });

    it("should return the path unchanged for the root path", () => {
      expect(safeCallbackUrl("/")).toBe("/");
    });

    it("should return the path unchanged for a deep path with multiple segments", () => {
      expect(
        safeCallbackUrl("/fr/dashboard/circles/paris-tech/moments/new")
      ).toBe("/fr/dashboard/circles/paris-tech/moments/new");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Open redirect — URLs absolues
  // Ces URLs doivent être rejetées pour empêcher les redirects
  // vers des domaines externes malveillants
  // ─────────────────────────────────────────────────────────────

  describe("given an absolute URL (external redirect attempt)", () => {
    it("should return undefined for an https URL", () => {
      expect(safeCallbackUrl("https://evil.com/steal")).toBeUndefined();
    });

    it("should return undefined for an http URL", () => {
      expect(safeCallbackUrl("http://attacker.com")).toBeUndefined();
    });

    it("should return undefined for a javascript: URL", () => {
      expect(safeCallbackUrl("javascript:alert(1)")).toBeUndefined();
    });

    it("should return undefined for a data: URL", () => {
      expect(safeCallbackUrl("data:text/html,<script>alert(1)</script>")).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Open redirect — URL à protocole relatif ("//")
  // "//evil.com" est interprété comme "https://evil.com" par les navigateurs
  // ─────────────────────────────────────────────────────────────

  describe("given a protocol-relative URL starting with //", () => {
    it("should return undefined for //evil.com", () => {
      expect(safeCallbackUrl("//evil.com")).toBeUndefined();
    });

    it("should return undefined for //evil.com/path", () => {
      expect(safeCallbackUrl("//evil.com/steal-cookie")).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Valeurs nulles et vides
  // ─────────────────────────────────────────────────────────────

  describe("given null, undefined, or empty string", () => {
    it("should return undefined for null", () => {
      expect(safeCallbackUrl(null)).toBeUndefined();
    });

    it("should return undefined for undefined", () => {
      expect(safeCallbackUrl(undefined)).toBeUndefined();
    });

    it("should return undefined for an empty string", () => {
      expect(safeCallbackUrl("")).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Spécification par l'exemple — table de vérité
  // ─────────────────────────────────────────────────────────────

  describe("exhaustive truth table", () => {
    it.each([
      // Valides
      { input: "/dashboard", expected: "/dashboard" },
      { input: "/fr/m/event-slug", expected: "/fr/m/event-slug" },
      { input: "/", expected: "/" },
      // Rejets — open redirect
      { input: "https://evil.com", expected: undefined },
      { input: "http://evil.com", expected: undefined },
      { input: "//evil.com", expected: undefined },
      { input: "//", expected: undefined },
      { input: "javascript:void(0)", expected: undefined },
      // Rejets — valeurs vides
      { input: null, expected: undefined },
      { input: undefined, expected: undefined },
      { input: "", expected: undefined },
    ])(
      "safeCallbackUrl($input) should return $expected",
      ({ input, expected }) => {
        expect(safeCallbackUrl(input as string | null | undefined)).toBe(
          expected
        );
      }
    );
  });
});

import { describe, it, expect } from "vitest";
import {
  getDisplayName,
  getCircleUserInitials,
  getPublicDisplayName,
  getPublicUserInitials,
} from "@/lib/display-name";

/**
 * Tests — display-name.ts
 *
 * Règles métier :
 * - getDisplayName : prénom + nom > prénom seul > email (fallback) — contextes privés
 * - getCircleUserInitials : initiales prénom+nom > initiale prénom > initiale email — contextes privés
 * - getPublicDisplayName : prénom + nom > prénom seul > fallback générique (jamais d'email)
 * - getPublicUserInitials : initiales prénom+nom > initiale prénom > "?" (jamais d'email)
 */

// ─────────────────────────────────────────────────────────────────────────────
// getDisplayName
// ─────────────────────────────────────────────────────────────────────────────

describe("getDisplayName", () => {
  describe("given a user with first name and last name", () => {
    it("should return 'firstName lastName'", () => {
      expect(getDisplayName("Alice", "Dupont", "alice@example.com")).toBe(
        "Alice Dupont"
      );
    });

    it("should separate first and last name with a single space", () => {
      const result = getDisplayName("Jean", "Martin", "jean@example.com");
      expect(result).toBe("Jean Martin");
    });
  });

  describe("given a user with first name only (no last name)", () => {
    it("should return the first name alone when lastName is null", () => {
      expect(getDisplayName("Alice", null, "alice@example.com")).toBe("Alice");
    });

    it("should return the first name alone when lastName is undefined", () => {
      expect(getDisplayName("Alice", undefined, "alice@example.com")).toBe(
        "Alice"
      );
    });

    it("should return the first name alone when lastName is an empty string", () => {
      // Une chaîne vide est falsy — le fallback s'applique
      expect(getDisplayName("Alice", "", "alice@example.com")).toBe("Alice");
    });
  });

  describe("given a user with no first name", () => {
    it("should fall back to email when firstName is null", () => {
      expect(getDisplayName(null, null, "alice@example.com")).toBe(
        "alice@example.com"
      );
    });

    it("should fall back to email when firstName is undefined", () => {
      expect(getDisplayName(undefined, undefined, "alice@example.com")).toBe(
        "alice@example.com"
      );
    });

    it("should fall back to email when firstName is an empty string", () => {
      expect(getDisplayName("", "Dupont", "alice@example.com")).toBe(
        "alice@example.com"
      );
    });

    it("should fall back to email even if lastName is provided", () => {
      // lastName sans firstName n'est pas un affichage valide
      expect(getDisplayName(null, "Dupont", "alice@example.com")).toBe(
        "alice@example.com"
      );
    });
  });

  describe("priority order — firstName + lastName > firstName > email", () => {
    it.each([
      {
        firstName: "Alice",
        lastName: "Dupont",
        email: "a@b.com",
        expected: "Alice Dupont",
        label: "prénom + nom",
      },
      {
        firstName: "Alice",
        lastName: null,
        email: "a@b.com",
        expected: "Alice",
        label: "prénom seul",
      },
      {
        firstName: null,
        lastName: null,
        email: "a@b.com",
        expected: "a@b.com",
        label: "email seul",
      },
    ])("should return $expected given $label", ({ firstName, lastName, email, expected }) => {
      expect(getDisplayName(firstName, lastName, email)).toBe(expected);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getCircleUserInitials
// ─────────────────────────────────────────────────────────────────────────────

describe("getCircleUserInitials", () => {
  describe("given a user with first name and last name", () => {
    it("should return the uppercased initials of first and last name", () => {
      expect(
        getCircleUserInitials({
          firstName: "Alice",
          lastName: "Dupont",
          email: "alice@example.com",
        })
      ).toBe("AD");
    });

    it("should uppercase both initials regardless of input case", () => {
      expect(
        getCircleUserInitials({
          firstName: "alice",
          lastName: "dupont",
          email: "alice@example.com",
        })
      ).toBe("AD");
    });

    it("should use the first character of each name", () => {
      expect(
        getCircleUserInitials({
          firstName: "Jean-Baptiste",
          lastName: "Martin",
          email: "jb@example.com",
        })
      ).toBe("JM");
    });
  });

  describe("given a user with first name only (no last name)", () => {
    it("should return the uppercased initial of the first name when lastName is null", () => {
      expect(
        getCircleUserInitials({
          firstName: "Alice",
          lastName: null,
          email: "alice@example.com",
        })
      ).toBe("A");
    });

    it("should return the uppercased initial of the first name when lastName is undefined", () => {
      expect(
        getCircleUserInitials({
          firstName: "Alice",
          lastName: undefined,
          email: "alice@example.com",
        })
      ).toBe("A");
    });

    it("should return a single uppercase character", () => {
      const result = getCircleUserInitials({
        firstName: "zeynep",
        lastName: null,
        email: "z@example.com",
      });
      expect(result).toBe("Z");
      expect(result).toHaveLength(1);
    });
  });

  describe("given a user with no first name", () => {
    it("should fall back to the uppercased first character of the email", () => {
      expect(
        getCircleUserInitials({
          firstName: null,
          lastName: null,
          email: "alice@example.com",
        })
      ).toBe("A");
    });

    it("should uppercase the email initial", () => {
      expect(
        getCircleUserInitials({
          firstName: undefined,
          lastName: undefined,
          email: "zoe@example.com",
        })
      ).toBe("Z");
    });

    it("should use the email even if lastName is provided (no firstName = no initials)", () => {
      expect(
        getCircleUserInitials({
          firstName: null,
          lastName: "Dupont",
          email: "alice@example.com",
        })
      ).toBe("A");
    });
  });

  describe("priority order — firstName+lastName > firstName > email", () => {
    it.each([
      {
        user: { firstName: "Alice", lastName: "Dupont", email: "a@b.com" },
        expected: "AD",
        label: "prénom + nom",
      },
      {
        user: { firstName: "Alice", lastName: null, email: "a@b.com" },
        expected: "A",
        label: "prénom seul",
      },
      {
        user: { firstName: null, lastName: null, email: "a@b.com" },
        expected: "A",
        label: "email seul",
      },
    ])(
      "should return '$expected' given $label",
      ({ user, expected }) => {
        expect(getCircleUserInitials(user)).toBe(expected);
      }
    );
  });

  describe("output format", () => {
    it("should always return an uppercase string", () => {
      const cases = [
        { firstName: "alice", lastName: "dupont", email: "x@x.com" },
        { firstName: "bob", lastName: null, email: "x@x.com" },
        { firstName: null, lastName: null, email: "charlie@x.com" },
      ];
      for (const user of cases) {
        const result = getCircleUserInitials(user);
        expect(result).toBe(result.toUpperCase());
      }
    });

    it("should return at most 2 characters when both names are provided", () => {
      const result = getCircleUserInitials({
        firstName: "Alice",
        lastName: "Dupont",
        email: "a@b.com",
      });
      expect(result).toHaveLength(2);
    });

    it("should return exactly 1 character when only first name is provided", () => {
      const result = getCircleUserInitials({
        firstName: "Alice",
        lastName: null,
        email: "a@b.com",
      });
      expect(result).toHaveLength(1);
    });

    it("should return exactly 1 character when falling back to email", () => {
      const result = getCircleUserInitials({
        firstName: null,
        lastName: null,
        email: "alice@example.com",
      });
      expect(result).toHaveLength(1);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPublicDisplayName — jamais d'email exposé
// ─────────────────────────────────────────────────────────────────────────────

describe("getPublicDisplayName", () => {
  describe("given a user with first name and last name", () => {
    it("should return 'firstName lastName'", () => {
      expect(getPublicDisplayName("Alice", "Dupont", "Membre")).toBe("Alice Dupont");
    });
  });

  describe("given a user with first name only", () => {
    it("should return the first name when lastName is null", () => {
      expect(getPublicDisplayName("Alice", null, "Membre")).toBe("Alice");
    });

    it("should return the first name when lastName is empty (falsy)", () => {
      expect(getPublicDisplayName("Alice", "", "Membre")).toBe("Alice");
    });
  });

  describe("given a user with no first name (RGPD-sensitive case)", () => {
    it("should return the fallback when firstName is null — never exposing email", () => {
      expect(getPublicDisplayName(null, null, "Membre")).toBe("Membre");
    });

    it("should return the fallback when firstName is undefined", () => {
      expect(getPublicDisplayName(undefined, undefined, "Member")).toBe("Member");
    });

    it("should return the fallback when firstName is empty even with lastName", () => {
      expect(getPublicDisplayName("", "Dupont", "Membre")).toBe("Membre");
    });

    it("should localize via the caller-provided fallback (FR vs EN)", () => {
      expect(getPublicDisplayName(null, null, "Membre")).toBe("Membre");
      expect(getPublicDisplayName(null, null, "Member")).toBe("Member");
    });
  });

  describe("priority order — firstName + lastName > firstName > fallback", () => {
    it.each([
      { firstName: "Alice", lastName: "Dupont", expected: "Alice Dupont", label: "prénom + nom" },
      { firstName: "Alice", lastName: null, expected: "Alice", label: "prénom seul" },
      { firstName: null, lastName: null, expected: "Membre", label: "fallback générique" },
    ])("should return '$expected' given $label", ({ firstName, lastName, expected }) => {
      expect(getPublicDisplayName(firstName, lastName, "Membre")).toBe(expected);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPublicUserInitials — jamais d'initiale d'email
// ─────────────────────────────────────────────────────────────────────────────

describe("getPublicUserInitials", () => {
  describe("given a user with first name and last name", () => {
    it("should return uppercased initials", () => {
      expect(getPublicUserInitials({ firstName: "Alice", lastName: "Dupont" })).toBe("AD");
    });
  });

  describe("given a user with first name only", () => {
    it("should return the first initial", () => {
      expect(getPublicUserInitials({ firstName: "Alice", lastName: null })).toBe("A");
    });
  });

  describe("given a user with no first name (RGPD-sensitive case)", () => {
    it("should return '?' instead of an email-derived initial", () => {
      expect(getPublicUserInitials({ firstName: null, lastName: null })).toBe("?");
    });

    it("should return '?' when only lastName is provided (no first = no initials)", () => {
      expect(getPublicUserInitials({ firstName: null, lastName: "Dupont" })).toBe("?");
    });

    it("should return '?' for undefined fields", () => {
      expect(getPublicUserInitials({})).toBe("?");
    });
  });
});

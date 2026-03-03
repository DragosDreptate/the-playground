import { describe, it, expect } from "vitest";
import {
  resolveCustomCategoryForCreate,
  resolveCustomCategoryForUpdate,
} from "@/lib/circle-category-helpers";

// ─────────────────────────────────────────────────────────────
// resolveCustomCategoryForCreate
// ─────────────────────────────────────────────────────────────

describe("resolveCustomCategoryForCreate", () => {
  describe("given category is OTHER", () => {
    it("should return the value when filled", () => {
      expect(resolveCustomCategoryForCreate("OTHER", "Agilité d'esprit")).toBe("Agilité d'esprit");
    });

    it("should trim surrounding whitespace", () => {
      expect(resolveCustomCategoryForCreate("OTHER", "  Board games  ")).toBe("Board games");
    });

    it("should return null when value is empty string", () => {
      expect(resolveCustomCategoryForCreate("OTHER", "")).toBeNull();
    });

    it("should return null when value is only whitespace", () => {
      expect(resolveCustomCategoryForCreate("OTHER", "   ")).toBeNull();
    });

    it("should return null when value is null", () => {
      expect(resolveCustomCategoryForCreate("OTHER", null)).toBeNull();
    });

    it("should return null when value is undefined", () => {
      expect(resolveCustomCategoryForCreate("OTHER", undefined)).toBeNull();
    });
  });

  describe("given category is a predefined value (not OTHER)", () => {
    it.each(["TECH", "DESIGN", "BUSINESS", "SPORT_WELLNESS", "ART_CULTURE", "SCIENCE_EDUCATION", "SOCIAL"] as const)(
      "should return undefined for %s even when a form value is provided",
      (category) => {
        expect(resolveCustomCategoryForCreate(category, "some value")).toBeUndefined();
      }
    );

    it("should return undefined when category is predefined and form value is empty", () => {
      expect(resolveCustomCategoryForCreate("TECH", "")).toBeUndefined();
    });
  });

  describe("given no category", () => {
    it("should return undefined when category is undefined", () => {
      expect(resolveCustomCategoryForCreate(undefined, "anything")).toBeUndefined();
    });

    it("should return undefined when category is undefined and value is null", () => {
      expect(resolveCustomCategoryForCreate(undefined, null)).toBeUndefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────
// resolveCustomCategoryForUpdate
// ─────────────────────────────────────────────────────────────

describe("resolveCustomCategoryForUpdate", () => {
  describe("given new category is OTHER", () => {
    it("should return the value when switching from a predefined category to OTHER", () => {
      expect(resolveCustomCategoryForUpdate("OTHER", "TECH", "Agilité d'esprit")).toBe("Agilité d'esprit");
    });

    it("should return the new value when staying on OTHER", () => {
      expect(resolveCustomCategoryForUpdate("OTHER", "OTHER", "new value")).toBe("new value");
    });

    it("should return updated value when previous customCategory existed", () => {
      expect(resolveCustomCategoryForUpdate("OTHER", "OTHER", "updated theme")).toBe("updated theme");
    });

    it("should trim whitespace from the value", () => {
      expect(resolveCustomCategoryForUpdate("OTHER", "TECH", "  Jeux de société  ")).toBe("Jeux de société");
    });

    it("should return null when form value is empty string", () => {
      expect(resolveCustomCategoryForUpdate("OTHER", "TECH", "")).toBeNull();
    });

    it("should return null when form value is only whitespace", () => {
      expect(resolveCustomCategoryForUpdate("OTHER", "TECH", "   ")).toBeNull();
    });

    it("should return null when form value is null", () => {
      expect(resolveCustomCategoryForUpdate("OTHER", "TECH", null)).toBeNull();
    });

    it("should return null when form value is undefined", () => {
      expect(resolveCustomCategoryForUpdate("OTHER", "TECH", undefined)).toBeNull();
    });

    it("should return value when switching from null category to OTHER", () => {
      expect(resolveCustomCategoryForUpdate("OTHER", null, "theme libre")).toBe("theme libre");
    });
  });

  describe("given new category is predefined (not OTHER) and existing was OTHER", () => {
    it("should return null to clear customCategory when switching from OTHER to TECH", () => {
      expect(resolveCustomCategoryForUpdate("TECH", "OTHER", "old value")).toBeNull();
    });

    it("should return null when switching from OTHER to SOCIAL", () => {
      expect(resolveCustomCategoryForUpdate("SOCIAL", "OTHER", "old value")).toBeNull();
    });

    it("should return null when switching from OTHER to DESIGN", () => {
      expect(resolveCustomCategoryForUpdate("DESIGN", "OTHER", "old value")).toBeNull();
    });

    it("should return null even when form value is empty (existing OTHER must be cleared)", () => {
      expect(resolveCustomCategoryForUpdate("TECH", "OTHER", "")).toBeNull();
    });

    it("should return null when new category is null but existing was OTHER", () => {
      expect(resolveCustomCategoryForUpdate(null, "OTHER", "old value")).toBeNull();
    });
  });

  describe("given neither new nor existing category is OTHER", () => {
    it("should return undefined when switching between two predefined categories", () => {
      expect(resolveCustomCategoryForUpdate("TECH", "DESIGN", "anything")).toBeUndefined();
    });

    it("should return undefined when category does not change", () => {
      expect(resolveCustomCategoryForUpdate("TECH", "TECH", "anything")).toBeUndefined();
    });

    it("should return undefined when both categories are null", () => {
      expect(resolveCustomCategoryForUpdate(null, null, "anything")).toBeUndefined();
    });

    it("should return undefined when existing is null and new is predefined", () => {
      expect(resolveCustomCategoryForUpdate("TECH", null, "anything")).toBeUndefined();
    });

    it("should return undefined when new is null and existing is predefined", () => {
      expect(resolveCustomCategoryForUpdate(null, "TECH", "anything")).toBeUndefined();
    });

    it("should return undefined when both categories are undefined", () => {
      expect(resolveCustomCategoryForUpdate(undefined, undefined, "anything")).toBeUndefined();
    });

    it("should ignore the form value entirely when neither category is OTHER", () => {
      expect(resolveCustomCategoryForUpdate("SPORT_WELLNESS", "BUSINESS", "a stray value")).toBeUndefined();
    });
  });
});

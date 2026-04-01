import { describe, it, expect } from "vitest";
import { parseChangelog } from "@/lib/parse-changelog";

/**
 * Tests — parseChangelog (lib/parse-changelog.ts)
 *
 * Règle métier : parse un fichier CHANGELOG.md au format conventionnel
 * et retourne un tableau structuré d'entrées versionnées.
 * Supporte trois formats de première ligne :
 *   [0.9.0] — 2026-02-23 — Titre       (tirets em, format manuel)
 *   [0.9.0] - 2026-02-23               (Keep a Changelog)
 *   [0.9.0](url) (2026-02-23)          (release-please avec lien)
 */

describe("parseChangelog", () => {
  // ─────────────────────────────────────────────────────────────
  // Cas de base — entrée vide
  // ─────────────────────────────────────────────────────────────

  describe("given an empty string", () => {
    it("should return an empty array", () => {
      expect(parseChangelog("")).toEqual([]);
    });
  });

  describe("given a changelog with no valid entries", () => {
    it("should return an empty array when only [Unreleased] is present", () => {
      const content = `# Changelog\n\n## [Unreleased]\n\n### Added\n- some upcoming feature\n`;
      expect(parseChangelog(content)).toEqual([]);
    });

    it("should return an empty array for an entry without content", () => {
      const content = `## [1.0.0] - 2026-01-01\n\n### Added\n`;
      // Pas de changements listés → hasContent = false
      expect(parseChangelog(content)).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Format Keep a Changelog (tirets simples)
  // ─────────────────────────────────────────────────────────────

  describe("given a single entry in Keep a Changelog format", () => {
    const content = `
## [1.2.0] - 2026-03-01

### Added
- New feature A
- New feature B

### Fixed
- Bug fix C
`;

    it("should parse the version correctly", () => {
      const result = parseChangelog(content);
      expect(result).toHaveLength(1);
      expect(result[0].version).toBe("1.2.0");
    });

    it("should parse the date correctly", () => {
      const result = parseChangelog(content);
      expect(result[0].date).toBe("2026-03-01");
    });

    it("should parse sections with their changes", () => {
      const result = parseChangelog(content);
      const sections = result[0].sections;
      expect(sections).toHaveLength(2);
      expect(sections[0].title).toBe("Added");
      expect(sections[0].changes).toHaveLength(2);
      expect(sections[0].changes[0]).toBe("New feature A");
      expect(sections[0].changes[1]).toBe("New feature B");
      expect(sections[1].title).toBe("Fixed");
      expect(sections[1].changes[0]).toBe("Bug fix C");
    });

    it("should have undefined title when no title is present", () => {
      const result = parseChangelog(content);
      expect(result[0].title).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Format avec titre (tirets em — format projet)
  // ─────────────────────────────────────────────────────────────

  describe("given an entry with an em-dash title", () => {
    const content = `
## [0.9.0] — 2026-02-23 — Circle Invite Feature

### Added
- Generate invite token
- Join via invite link
`;

    it("should parse the title correctly", () => {
      const result = parseChangelog(content);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Circle Invite Feature");
    });

    it("should parse version and date correctly", () => {
      const result = parseChangelog(content);
      expect(result[0].version).toBe("0.9.0");
      expect(result[0].date).toBe("2026-02-23");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Plusieurs entrées
  // ─────────────────────────────────────────────────────────────

  describe("given multiple entries", () => {
    const content = `
# Changelog

## [Unreleased]

### Added
- Future feature

## [2.0.0] - 2026-03-01

### Added
- Major feature
- Another major feature

## [1.5.0] - 2026-02-15

### Fixed
- Critical bug
`;

    it("should return only versioned entries (skip [Unreleased])", () => {
      const result = parseChangelog(content);
      expect(result).toHaveLength(2);
    });

    it("should return entries in order of appearance", () => {
      const result = parseChangelog(content);
      expect(result[0].version).toBe("2.0.0");
      expect(result[1].version).toBe("1.5.0");
    });

    it("should parse each entry independently", () => {
      const result = parseChangelog(content);
      expect(result[0].sections[0].changes).toHaveLength(2);
      expect(result[1].sections[0].changes).toHaveLength(1);
      expect(result[1].sections[0].title).toBe("Fixed");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Nettoyage du markdown — gras, italique, code inline
  // ─────────────────────────────────────────────────────────────

  describe("given markdown formatting in change items", () => {
    const content = `
## [1.0.0] - 2026-01-01

### Added
- **Bold feature** description
- *Italic note* about the change
- \`code snippet\` added
`;

    it("should strip bold markdown from change text", () => {
      const result = parseChangelog(content);
      expect(result[0].sections[0].changes[0]).toBe("Bold feature description");
    });

    it("should strip italic markdown from change text", () => {
      const result = parseChangelog(content);
      expect(result[0].sections[0].changes[1]).toBe("Italic note about the change");
    });

    it("should strip inline code markdown from change text", () => {
      const result = parseChangelog(content);
      expect(result[0].sections[0].changes[2]).toBe("code snippet added");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Format release-please — [version](url) (date) + astérisques
  // ─────────────────────────────────────────────────────────────

  describe("given an entry in release-please format", () => {
    const content = `
## [2.2.0](https://github.com/org/repo/compare/v2.1.0...v2.2.0) (2026-04-01)


### Added

* **sentry:** analyse automatique des nouvelles issues via webhook ([1243963](https://github.com/org/repo/commit/1243963))
* **slack:** notifications admin via Slack ([301b186](https://github.com/org/repo/commit/301b186))

### Fixed

* **release:** éliminer la race condition ([83afb5f](https://github.com/org/repo/commit/83afb5f))
`;

    it("should parse version and date from release-please format", () => {
      const result = parseChangelog(content);
      expect(result).toHaveLength(1);
      expect(result[0].version).toBe("2.2.0");
      expect(result[0].date).toBe("2026-04-01");
    });

    it("should have no title for release-please entries", () => {
      const result = parseChangelog(content);
      expect(result[0].title).toBeUndefined();
    });

    it("should parse asterisk-prefixed items", () => {
      const result = parseChangelog(content);
      expect(result[0].sections).toHaveLength(2);
      expect(result[0].sections[0].title).toBe("Added");
      expect(result[0].sections[0].changes).toHaveLength(2);
      expect(result[0].sections[1].title).toBe("Fixed");
      expect(result[0].sections[1].changes).toHaveLength(1);
    });

    it("should strip commit links and hashes from change text", () => {
      const result = parseChangelog(content);
      expect(result[0].sections[0].changes[0]).toBe(
        "sentry: analyse automatique des nouvelles issues via webhook"
      );
      expect(result[0].sections[1].changes[0]).toBe(
        "release: éliminer la race condition"
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Lignes ignorées — tables, blockquotes, règles horizontales
  // ─────────────────────────────────────────────────────────────

  describe("given table rows, blockquotes, and horizontal rules", () => {
    const content = `
## [1.0.0] - 2026-01-01

### Added
- First change

---

| Column | Value |
| --- | --- |
| key | val |

> Note: this is a blockquote

- Second change
`;

    it("should not include table rows or blockquotes as changes", () => {
      const result = parseChangelog(content);
      const changes = result[0].sections[0].changes;
      expect(changes).toHaveLength(2);
      expect(changes[0]).toBe("First change");
      expect(changes[1]).toBe("Second change");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Section sans changements listés — doit être incluse si d'autres
  // sections ont des changements
  // ─────────────────────────────────────────────────────────────

  describe("given an entry where one section is empty but another has content", () => {
    const content = `
## [1.0.0] - 2026-01-01

### Added

### Fixed
- Important fix
`;

    it("should include the entry because hasContent is true overall", () => {
      const result = parseChangelog(content);
      expect(result).toHaveLength(1);
    });

    it("should include the empty section title with no changes", () => {
      const result = parseChangelog(content);
      const sections = result[0].sections;
      expect(sections).toHaveLength(2);
      expect(sections[0].title).toBe("Added");
      expect(sections[0].changes).toHaveLength(0);
      expect(sections[1].title).toBe("Fixed");
      expect(sections[1].changes).toHaveLength(1);
    });
  });
});

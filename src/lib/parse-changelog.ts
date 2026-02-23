import { readFileSync } from "fs";
import { join } from "path";

export type ChangelogSection = {
  title: string;
  changes: string[];
};

export type ChangelogEntry = {
  version: string;
  date: string;
  title?: string;
  sections: ChangelogSection[];
};

export function getChangelog(): ChangelogEntry[] {
  const content = readFileSync(join(process.cwd(), "CHANGELOG.md"), "utf-8");
  return parseChangelog(content);
}

export function parseChangelog(content: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const blocks = content.split(/^## /m).slice(1);

  for (const block of blocks) {
    const lines = block.split("\n");
    const firstLine = lines[0].trim();

    // Handles both formats:
    //   [0.9.0] — 2026-02-23 — Title   (existing format, em dash)
    //   [0.9.0] - 2026-02-23            (Keep a Changelog / release-please)
    const match = firstLine.match(
      /^\[(\d+\.\d+\.\d+)\]\s*[—–-]+\s*(\d{4}-\d{2}-\d{2})(?:\s*[—–-]+\s*(.+))?/
    );
    if (!match) continue; // skip [Unreleased]

    const version = match[1];
    const date = match[2];
    const title = match[3]?.trim();

    const sections: ChangelogSection[] = [];
    let currentSection: ChangelogSection | null = null;

    for (const line of lines.slice(1)) {
      // Skip horizontal rules, table rows, blockquotes, and empty subsection context
      if (
        line.startsWith("---") ||
        line.startsWith("|") ||
        line.startsWith(">") ||
        line.startsWith("  -")
      )
        continue;

      const sectionMatch = line.match(/^### (.+)/);
      if (sectionMatch) {
        currentSection = { title: sectionMatch[1].trim(), changes: [] };
        sections.push(currentSection);
        continue;
      }

      const changeMatch = line.match(/^- (.+)/);
      if (changeMatch && currentSection) {
        // Strip markdown bold/italic/code for plain text display
        const text = changeMatch[1]
          .replace(/\*\*(.+?)\*\*/g, "$1")
          .replace(/\*(.+?)\*/g, "$1")
          .replace(/`(.+?)`/g, "$1");
        currentSection.changes.push(text);
      }
    }

    const hasContent = sections.some((s) => s.changes.length > 0);
    if (hasContent) {
      entries.push({ version, date, title, sections });
    }
  }

  return entries;
}

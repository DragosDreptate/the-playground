import { describe, it, expect } from "vitest";
import {
  getDateFnsLocale,
  formatShortDate,
  formatTime,
  formatDayMonth,
  formatWeekdayAndDate,
  formatDateRange,
} from "@/lib/format-date";
import { fr } from "date-fns/locale/fr";
import { enUS } from "date-fns/locale/en-US";

// Samedi 25 janvier 2026 à 22:00 UTC
const SATURDAY = new Date("2026-01-25T22:00:00Z");
// Fin 23:30 UTC
const END_TIME = new Date("2026-01-25T23:30:00Z");

describe("getDateFnsLocale", () => {
  it("should return fr locale for 'fr'", () => {
    expect(getDateFnsLocale("fr")).toBe(fr);
  });

  it("should return enUS locale for 'en'", () => {
    expect(getDateFnsLocale("en")).toBe(enUS);
  });

  it("should return enUS locale for unknown locales", () => {
    expect(getDateFnsLocale("de")).toBe(enUS);
    expect(getDateFnsLocale("es")).toBe(enUS);
  });
});

describe("formatTime", () => {
  it("should format time in 24h HH:mm without Intl dependency", () => {
    expect(formatTime(SATURDAY)).toBe("22:00");
  });

  it("should format end time correctly", () => {
    expect(formatTime(END_TIME)).toBe("23:30");
  });

  it("should pad hours with zero", () => {
    const earlyMorning = new Date("2026-01-25T09:05:00Z");
    expect(formatTime(earlyMorning)).toBe("09:05");
  });
});

describe("formatShortDate", () => {
  it("should format date in French", () => {
    const result = formatShortDate(SATURDAY, "fr");
    // "dim. 25 janv." — samedi en UTC
    expect(result).toMatch(/25/);
    expect(result).toMatch(/janv/);
  });

  it("should format date in English", () => {
    const result = formatShortDate(SATURDAY, "en");
    expect(result).toMatch(/25/);
    expect(result).toMatch(/Jan/);
  });

  it("should produce consistent output (not Intl-dependent)", () => {
    const result1 = formatShortDate(SATURDAY, "fr");
    const result2 = formatShortDate(SATURDAY, "fr");
    expect(result1).toBe(result2);
  });
});

describe("formatDayMonth", () => {
  it("should format day and month in French", () => {
    const result = formatDayMonth(SATURDAY, "fr");
    expect(result).toMatch(/25/);
    expect(result).toMatch(/janv/);
  });

  it("should format day and month in English", () => {
    const result = formatDayMonth(SATURDAY, "en");
    expect(result).toMatch(/25/);
    expect(result).toMatch(/Jan/);
  });
});

describe("formatWeekdayAndDate", () => {
  it("should return weekday and dateStr in French", () => {
    const { weekday, dateStr } = formatWeekdayAndDate(SATURDAY, "fr");
    expect(weekday).toBeTruthy();
    expect(dateStr).toMatch(/25/);
    expect(dateStr).toMatch(/2026/);
    expect(dateStr).toMatch(/janv/);
  });

  it("should return weekday and dateStr in English", () => {
    const { weekday, dateStr } = formatWeekdayAndDate(SATURDAY, "en");
    expect(weekday).toBeTruthy();
    expect(dateStr).toMatch(/25/);
    expect(dateStr).toMatch(/2026/);
    expect(dateStr).toMatch(/Jan/);
  });
});

describe("formatDateRange", () => {
  describe("given a start time only", () => {
    it("should format as 'date · HH:mm'", () => {
      const result = formatDateRange(SATURDAY, null, "fr");
      expect(result).toContain("22:00");
      expect(result).toContain("·");
    });
  });

  describe("given start and end times", () => {
    it("should format as 'date · HH:mm – HH:mm'", () => {
      const result = formatDateRange(SATURDAY, END_TIME, "fr");
      expect(result).toContain("22:00");
      expect(result).toContain("23:30");
      expect(result).toContain("–");
      expect(result).toContain("·");
    });

    it("should work in English too", () => {
      const result = formatDateRange(SATURDAY, END_TIME, "en");
      expect(result).toContain("22:00");
      expect(result).toContain("23:30");
      expect(result).toContain("–");
    });
  });

  describe("given various locales", () => {
    it.each([
      ["fr", /janv/],
      ["en", /Jan/],
    ])("should include month abbreviation for locale %s", (locale, monthPattern) => {
      const result = formatDateRange(SATURDAY, null, locale);
      expect(result).toMatch(monthPattern);
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  formatShortDate,
  formatTime,
  formatDayMonth,
  formatWeekdayAndDate,
  formatDateRange,
  formatMomentDateTime,
} from "@/lib/format-date";

/**
 * Dates de test — toutes en UTC.
 * L'événement "dimanche 25 janvier à 22:00 Paris" est stocké comme 21:00 UTC (UTC+1 hiver).
 */
const EVENT_UTC = new Date("2026-01-25T21:00:00.000Z"); // 21:00 UTC = 22:00 Paris (CET)
const END_UTC = new Date("2026-01-25T22:30:00.000Z"); // 22:30 UTC = 23:30 Paris

describe("formatTime", () => {
  it("should display Paris time (UTC+1 in winter), not UTC time", () => {
    // 21:00 UTC → 22:00 Paris (CET), pas 21:00
    expect(formatTime(EVENT_UTC)).toBe("22:00");
  });

  it("should format end time in Paris timezone", () => {
    // 22:30 UTC → 23:30 Paris
    expect(formatTime(END_UTC)).toBe("23:30");
  });

  it("should pad minutes with zero", () => {
    const earlyMorning = new Date("2026-01-25T08:05:00.000Z"); // 08:05 UTC = 09:05 Paris
    expect(formatTime(earlyMorning)).toBe("09:05");
  });

  it("should produce consistent output (server UTC and client Paris give same result)", () => {
    // L'intérêt du fix hydration : même résultat côté serveur (UTC) et client (Paris)
    const result1 = formatTime(EVENT_UTC);
    const result2 = formatTime(EVENT_UTC);
    expect(result1).toBe(result2);
    expect(result1).toBe("22:00");
  });
});

describe("formatShortDate", () => {
  it("should format date in French using Paris timezone", () => {
    const result = formatShortDate(EVENT_UTC, "fr");
    expect(result).toMatch(/25/);
    expect(result).toMatch(/janv/);
  });

  it("should format date in English using Paris timezone", () => {
    const result = formatShortDate(EVENT_UTC, "en");
    expect(result).toMatch(/25/);
    expect(result).toMatch(/Jan/);
  });

  it("should include weekday abbreviation", () => {
    const frResult = formatShortDate(EVENT_UTC, "fr");
    const enResult = formatShortDate(EVENT_UTC, "en");
    expect(frResult).toMatch(/dim|lun|mar|mer|jeu|ven|sam/i);
    expect(enResult).toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/i);
  });
});

describe("formatDayMonth", () => {
  it("should format day and month in French", () => {
    const result = formatDayMonth(EVENT_UTC, "fr");
    expect(result).toMatch(/25/);
    expect(result).toMatch(/janv/);
  });

  it("should format day and month in English", () => {
    const result = formatDayMonth(EVENT_UTC, "en");
    expect(result).toMatch(/25/);
    expect(result).toMatch(/Jan/);
  });
});

describe("formatWeekdayAndDate", () => {
  it("should return weekday and dateStr (no year) in French", () => {
    const { weekday, dateStr } = formatWeekdayAndDate(EVENT_UTC, "fr");
    expect(weekday).toBeTruthy();
    expect(dateStr).toMatch(/25/);
    expect(dateStr).toMatch(/janv/);
    expect(dateStr).not.toMatch(/2026/);
  });

  it("should return weekday and dateStr (no year) in English", () => {
    const { weekday, dateStr } = formatWeekdayAndDate(EVENT_UTC, "en");
    expect(weekday).toBeTruthy();
    expect(dateStr).toMatch(/25/);
    expect(dateStr).toMatch(/Jan/);
    expect(dateStr).not.toMatch(/2026/);
  });
});

describe("formatDateRange", () => {
  describe("given a start time only", () => {
    it("should format as 'date · HH:mm' in Paris time", () => {
      const result = formatDateRange(EVENT_UTC, null, "fr");
      expect(result).toContain("22:00"); // 21:00 UTC = 22:00 Paris
      expect(result).toContain("·");
    });
  });

  describe("given start and end times", () => {
    it("should format as 'date · HH:mm – HH:mm' in Paris time", () => {
      const result = formatDateRange(EVENT_UTC, END_UTC, "fr");
      expect(result).toContain("22:00"); // 21:00 UTC = 22:00 Paris
      expect(result).toContain("23:30"); // 22:30 UTC = 23:30 Paris
      expect(result).toContain("–");
      expect(result).toContain("·");
    });

    it("should work in English too", () => {
      const result = formatDateRange(EVENT_UTC, END_UTC, "en");
      expect(result).toContain("22:00");
      expect(result).toContain("23:30");
      expect(result).toContain("–");
    });
  });

  describe("Paris timezone correctness", () => {
    it("should show Paris time, not UTC time", () => {
      // Regression test: avant le fix, le serveur (UTC) affichait 21:00 au lieu de 22:00
      const result = formatDateRange(EVENT_UTC, null, "fr");
      expect(result).toContain("22:00"); // Paris time ✓
      expect(result).not.toContain("21:00"); // UTC time ✗
    });

    it.each([
      ["fr", /janv/],
      ["en", /Jan/],
    ])("should include month abbreviation for locale %s", (locale, monthPattern) => {
      const result = formatDateRange(EVENT_UTC, null, locale);
      expect(result).toMatch(monthPattern);
    });
  });

  describe("given start and end on different days (multi-day)", () => {
    // 25 janvier 22:00 Paris → 26 janvier 02:00 Paris
    const NIGHT_END_UTC = new Date("2026-01-26T01:00:00.000Z"); // 01:00 UTC = 02:00 Paris (CET)

    it("should include both dates and both times", () => {
      const result = formatDateRange(EVENT_UTC, NIGHT_END_UTC, "fr");
      expect(result).toContain("25");
      expect(result).toContain("26");
      expect(result).toContain("22:00");
      expect(result).toContain("02:00");
    });
  });
});

describe("formatMomentDateTime", () => {
  const START_UTC = new Date("2026-01-25T21:00:00.000Z"); // 22:00 Paris (CET)
  const SAME_DAY_END_UTC = new Date("2026-01-25T22:30:00.000Z"); // 23:30 Paris
  const NEXT_DAY_END_UTC = new Date("2026-01-26T01:00:00.000Z"); // 02:00 Paris

  describe("given no end date", () => {
    it("should return long date on line1 + single time on line2 (isMultiDay=false)", () => {
      const { line1, line2, isMultiDay } = formatMomentDateTime(START_UTC, null, "fr");
      expect(line1).toMatch(/dimanche/i);
      expect(line1).toContain("25");
      expect(line1).toMatch(/janvier/i);
      expect(line2).toBe("22:00");
      expect(isMultiDay).toBe(false);
    });
  });

  describe("given start and end on the same day", () => {
    it("should return long date on line1 + time range on line2 (isMultiDay=false)", () => {
      const { line1, line2, isMultiDay } = formatMomentDateTime(START_UTC, SAME_DAY_END_UTC, "fr");
      expect(line1).toMatch(/dimanche/i);
      expect(line1).toContain("25");
      expect(line2).toBe("22:00 – 23:30");
      expect(isMultiDay).toBe(false);
    });
  });

  describe("given start and end on different days", () => {
    it("should return one line per day, each with date + time (isMultiDay=true)", () => {
      const { line1, line2, isMultiDay } = formatMomentDateTime(START_UTC, NEXT_DAY_END_UTC, "fr");
      // Ligne 1 : "dim. 25 janv. · 22:00"
      expect(line1).toMatch(/dim/i);
      expect(line1).toContain("25");
      expect(line1).toContain("22:00");
      expect(line1).toContain("·");
      // Ligne 2 : "lun. 26 janv. · 02:00"
      expect(line2).toMatch(/lun/i);
      expect(line2).toContain("26");
      expect(line2).toContain("02:00");
      expect(line2).toContain("·");
      expect(isMultiDay).toBe(true);
    });

    it("should also work in English", () => {
      const { line1, line2, isMultiDay } = formatMomentDateTime(START_UTC, NEXT_DAY_END_UTC, "en");
      expect(line1).toContain("25");
      expect(line1).toContain("22:00");
      expect(line2).toContain("26");
      expect(line2).toContain("02:00");
      expect(isMultiDay).toBe(true);
    });
  });
});

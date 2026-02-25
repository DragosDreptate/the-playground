import { describe, it, expect } from "vitest";
import {
  formatShortDate,
  formatTime,
  formatDayMonth,
  formatWeekdayAndDate,
  formatDateRange,
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
  it("should return weekday and dateStr in French", () => {
    const { weekday, dateStr } = formatWeekdayAndDate(EVENT_UTC, "fr");
    expect(weekday).toBeTruthy();
    expect(dateStr).toMatch(/25/);
    expect(dateStr).toMatch(/2026/);
    expect(dateStr).toMatch(/janv/);
  });

  it("should return weekday and dateStr in English", () => {
    const { weekday, dateStr } = formatWeekdayAndDate(EVENT_UTC, "en");
    expect(weekday).toBeTruthy();
    expect(dateStr).toMatch(/25/);
    expect(dateStr).toMatch(/2026/);
    expect(dateStr).toMatch(/Jan/);
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
});

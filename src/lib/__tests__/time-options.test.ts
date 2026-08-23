import { describe, it, expect } from "vitest";
import {
  generateTimeOptions,
  combineDateAndTime,
  extractTime,
  extractDatePart,
  snapToSlot,
} from "../time-options";

describe("combineDateAndTime", () => {
  describe("given a date, a time string and an event timezone", () => {
    it("should return an ISO UTC string (not a naive local string)", () => {
      const date = new Date(2026, 1, 25);
      const result = combineDateAndTime(date, "10:00", "Europe/Paris");

      // Must be a valid ISO string ending in Z (UTC)
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("should anchor the time in the event timezone, not the browser's", () => {
      // Le cas signalé : 16:30 saisi pour un événement à Dublin, en février
      // (Europe/Dublin = UTC+0, Europe/Paris = UTC+1).
      const date = new Date(2026, 1, 25);

      expect(combineDateAndTime(date, "16:30", "Europe/Dublin")).toBe(
        "2026-02-25T16:30:00.000Z"
      );
      expect(combineDateAndTime(date, "16:30", "Europe/Paris")).toBe(
        "2026-02-25T15:30:00.000Z"
      );
    });

    it("should apply the summer offset of the event timezone, not the winter one", () => {
      // En août, Dublin passe à UTC+1 : le même 16:30 ne donne plus le même instant.
      const date = new Date(2026, 7, 25);

      expect(combineDateAndTime(date, "16:30", "Europe/Dublin")).toBe(
        "2026-08-25T15:30:00.000Z"
      );
    });

    it("should round-trip through extractTime in the same timezone", () => {
      const baseDate = new Date(2026, 1, 25);
      const combined = combineDateAndTime(baseDate, "23:00", "Europe/Dublin");

      expect(extractTime(new Date(combined), "Europe/Dublin")).toBe("23:00");
    });

    it("should keep the civil day the Host clicked, even near midnight", () => {
      // 23:30 à Dublin le 25 = 00:30 UTC le 26 : le jour civil saisi ne doit pas
      // glisser d'un cran dans le fuseau de l'événement.
      const date = new Date(2026, 7, 25);
      const combined = combineDateAndTime(date, "23:30", "Europe/Dublin");

      expect(combined).toBe("2026-08-25T22:30:00.000Z");
      expect(extractTime(new Date(combined), "Europe/Dublin")).toBe("23:30");
    });

    it("should set seconds and milliseconds to zero", () => {
      const date = new Date(2026, 2, 15);
      const parsed = new Date(combineDateAndTime(date, "14:30", "Europe/Paris"));

      expect(parsed.getSeconds()).toBe(0);
      expect(parsed.getMilliseconds()).toBe(0);
    });

    it.each([
      ["an invalid time", new Date(2026, 2, 15), "nope", "Europe/Paris"],
      ["an invalid date", new Date("nope"), "14:30", "Europe/Paris"],
    ])("should return an empty string given %s", (_label, date, time, tz) => {
      expect(combineDateAndTime(date as Date, time as string, tz as string)).toBe("");
    });
  });
});

describe("extractTime", () => {
  it("should read the instant in the given timezone", () => {
    const instant = new Date("2026-02-25T16:30:00.000Z");

    expect(extractTime(instant, "Europe/Dublin")).toBe("16:30");
    expect(extractTime(instant, "Europe/Paris")).toBe("17:30");
  });

  // Le garde-fou du chantier : sans fuseau explicite, éditer un événement depuis
  // une autre machine pré-remplirait une heure décalée, ré-enregistrée telle quelle.
  it("should stay stable regardless of where the form is opened from", () => {
    const instant = new Date("2026-08-25T15:30:00.000Z");

    expect(extractTime(instant, "Europe/Dublin")).toBe("16:30");
  });

  it("should zero-pad hours and minutes", () => {
    const instant = new Date("2026-03-15T09:05:00.000Z");
    expect(extractTime(instant, "UTC")).toBe("09:05");
  });
});

describe("extractDatePart", () => {
  it("should return the civil day in the event timezone, not the browser's", () => {
    // 22:30 UTC = le 25 à 23:30 à Dublin, mais déjà le 26 à 00:30 à Paris.
    const instant = new Date("2026-08-25T22:30:00.000Z");

    const dublin = extractDatePart(instant, "Europe/Dublin");
    const paris = extractDatePart(instant, "Europe/Paris");

    expect([dublin.getFullYear(), dublin.getMonth(), dublin.getDate()]).toEqual([2026, 7, 25]);
    expect([paris.getFullYear(), paris.getMonth(), paris.getDate()]).toEqual([2026, 7, 26]);
  });

  it("should return a local midnight Date, as the Calendar component expects", () => {
    const result = extractDatePart(new Date("2026-08-25T22:30:00.000Z"), "Europe/Dublin");

    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });
});

describe("snapToSlot", () => {
  it.each([
    ["17:00", "17:00"],
    ["17:14", "17:00"],
    ["17:15", "17:30"],
    ["17:29", "17:30"],
    ["17:30", "17:30"],
    ["17:44", "17:30"],
    ["17:45", "18:00"],
    ["17:59", "18:00"],
    ["23:45", "00:00"], // wrap around midnight
  ])("should snap %s → %s", (input, expected) => {
    expect(snapToSlot(input)).toBe(expected);
  });
});

describe("generateTimeOptions", () => {
  it("should generate 48 slots (24h × 2 per hour)", () => {
    expect(generateTimeOptions()).toHaveLength(48);
  });

  it("should start at 00:00 and end at 23:30", () => {
    const options = generateTimeOptions();
    expect(options[0].value).toBe("00:00");
    expect(options[47].value).toBe("23:30");
  });
});

import { describe, it, expect } from "vitest";
import {
  generateTimeOptions,
  combineDateAndTime,
  extractTime,
  snapToSlot,
} from "../time-options";

describe("combineDateAndTime", () => {
  describe("given a date and a time string", () => {
    it("should return an ISO UTC string (not a naive local string)", () => {
      const date = new Date("2026-02-25T00:00:00Z");
      const result = combineDateAndTime(date, "10:00");

      // Must be a valid ISO string ending in Z (UTC)
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("should round-trip correctly: extractTime(new Date(combined)) === original time", () => {
      // Simulate: user picks "23:00" in their local timezone
      const baseDate = new Date(2026, 1, 25); // local Feb 25
      const combined = combineDateAndTime(baseDate, "23:00");
      const parsed = new Date(combined);

      // extractTime uses getHours() (local) — should match what user picked
      expect(extractTime(parsed)).toBe("23:00");
    });

    it("should set seconds and milliseconds to zero", () => {
      const date = new Date("2026-03-15T00:00:00Z");
      const result = combineDateAndTime(date, "14:30");
      const parsed = new Date(result);

      expect(parsed.getSeconds()).toBe(0);
      expect(parsed.getMilliseconds()).toBe(0);
    });
  });
});

describe("extractTime", () => {
  it("should extract HH:mm from a Date in local time", () => {
    // Create a date that is 14:30 in local time
    const date = new Date(2026, 2, 15, 14, 30, 0);
    expect(extractTime(date)).toBe("14:30");
  });

  it("should zero-pad hours and minutes", () => {
    const date = new Date(2026, 2, 15, 9, 5, 0);
    expect(extractTime(date)).toBe("09:05");
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

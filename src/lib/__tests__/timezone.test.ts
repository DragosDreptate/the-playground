import { describe, it, expect } from "vitest";
import { getTimezoneCityLabel, formatTimezoneMention } from "../timezone";

describe("getTimezoneCityLabel", () => {
  it.each([
    ["Europe/Dublin", "Dublin"],
    ["Europe/Paris", "Paris"],
    ["America/New_York", "New York"],
    ["America/Argentina/Buenos_Aires", "Buenos Aires"],
    ["UTC", "UTC"],
  ])("should turn %s into %s", (timezone, expected) => {
    expect(getTimezoneCityLabel(timezone)).toBe(expected);
  });
});

describe("formatTimezoneMention", () => {
  it.each([
    ["Europe/Dublin", "fr", "heure de Dublin"],
    ["Europe/Dublin", "en", "Dublin time"],
    ["America/New_York", "fr", "heure de New York"],
  ])("should mention %s in %s as %s", (timezone, locale, expected) => {
    expect(formatTimezoneMention(timezone, locale)).toBe(expected);
  });

  // « heure de UTC » ne se dit pas : on laisse le sigle nu.
  it.each(["UTC", "GMT"])("should leave %s bare", (timezone) => {
    expect(formatTimezoneMention(timezone, "fr")).toBe(timezone);
  });
});

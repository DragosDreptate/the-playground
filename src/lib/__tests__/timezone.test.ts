import { describe, it, expect } from "vitest";
import { getTimezoneCityLabel, formatTimezoneMention } from "../timezone";
import { normalizeTimezone } from "@/domain/models/moment";

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

describe("normalizeTimezone", () => {
  it.each([
    ["Europe/Paris", "Europe/Paris"],
    // La casse du navigateur ne doit pas finir dans un email (« heure de paris »).
    ["europe/paris", "Europe/Paris"],
    ["EUROPE/PARIS", "Europe/Paris"],
    // Les alias historiques restent acceptés : c'est la raison du choix d'Intl
    // plutôt que de supportedValuesOf.
    ["Asia/Calcutta", "Asia/Calcutta"],
    ["UTC", "UTC"],
    ["GMT", "UTC"],
  ])("should canonicalize %s to %s", (input, expected) => {
    expect(normalizeTimezone(input)).toBe(expected);
  });

  it.each([
    // Décalages bruts : acceptés par Intl, mais ce ne sont pas des zones — ils ne
    // portent aucune règle d'heure d'été et donneraient « heure de +01:00 ».
    "+01:00",
    "-05:00",
    "Europe/Atlantis",
    "",
    "Paris",
  ])("should reject %s", (input) => {
    expect(normalizeTimezone(input)).toBeNull();
  });
});

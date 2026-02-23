import { describe, it, expect } from "vitest";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import type { CalendarEventData } from "@/lib/calendar";

const APP_URL = "https://theplayground.community";

function makeEvent(overrides: Partial<CalendarEventData> = {}): CalendarEventData {
  return {
    title: "Apéro JS #12",
    startsAt: new Date("2026-03-05T19:00:00Z"),
    endsAt: new Date("2026-03-05T21:30:00Z"),
    locationType: "PHYSICAL",
    locationName: "Station F",
    locationAddress: "5 Parvis Alan Turing, Paris 13e",
    circleName: "Paris JS",
    slug: "apero-js-12",
    ...overrides,
  };
}

describe("buildGoogleCalendarUrl", () => {
  describe("given a physical event with start and end dates", () => {
    it("should return a valid Google Calendar URL", () => {
      const url = buildGoogleCalendarUrl(makeEvent(), APP_URL);
      expect(url).toContain("https://calendar.google.com/calendar/render");
      expect(url).toContain("action=TEMPLATE");
    });

    it("should include the event title", () => {
      const url = buildGoogleCalendarUrl(makeEvent(), APP_URL);
      // URLSearchParams encode les espaces en "+" (pas %20)
      expect(url).toContain("text=Ap%C3%A9ro+JS+%2312");
    });

    it("should include formatted dates", () => {
      const url = buildGoogleCalendarUrl(makeEvent(), APP_URL);
      expect(url).toContain("20260305T190000Z");
      expect(url).toContain("20260305T213000Z");
    });

    it("should include the physical location", () => {
      const url = buildGoogleCalendarUrl(makeEvent(), APP_URL);
      expect(url).toContain("Station+F");
    });

    it("should include the organizer and app URL in details", () => {
      const url = buildGoogleCalendarUrl(makeEvent(), APP_URL);
      expect(url).toContain("Paris+JS");
      expect(url).toContain(encodeURIComponent(APP_URL));
    });
  });

  describe("given an online event", () => {
    it("should set location to empty string", () => {
      const url = buildGoogleCalendarUrl(
        makeEvent({ locationType: "ONLINE", locationName: null, locationAddress: null }),
        APP_URL
      );
      expect(url).toContain("location=");
      // Should not include any physical address
      expect(url).not.toContain("Station+F");
    });
  });

  describe("given an event without end date", () => {
    it("should default end date to start + 2 hours", () => {
      const startsAt = new Date("2026-03-05T19:00:00Z");
      const url = buildGoogleCalendarUrl(
        makeEvent({ startsAt, endsAt: null }),
        APP_URL
      );
      // 19:00 + 2h = 21:00
      expect(url).toContain("20260305T190000Z%2F20260305T210000Z");
    });
  });
});

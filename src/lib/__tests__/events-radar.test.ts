import { describe, it, expect, vi } from "vitest";
import {
  deduplicateByUrl,
  buildEventbriteUrl,
  getWeekRange,
  meetupSearchWindow,
  meetupNodesToEvents,
  extractEventbriteEvents,
  extractKeywordsAndCity,
  LUMA_CITY,
  LUMA_LOCATION_TERMS,
  EVENTBRITE_LOCATION,
  EVENTBRITE_COUNTRY,
} from "@/lib/events-radar";
import type { EventResult, MeetupEventNode } from "@/lib/events-radar";

/**
 * Tests — Fonctions pures de lib/events-radar.ts
 *
 * Seules les fonctions pures (sans I/O) sont testées ici :
 *   - deduplicateByUrl
 *   - buildEventbriteUrl
 *   - getWeekRange
 *   - meetupSearchWindow, meetupNodesToEvents (API Meetup)
 *   - extractEventbriteEvents (lecture de la page de recherche)
 *   - extractKeywordsAndCity (appel IA injecté, seul le parsing est testé)
 *   - constantes de mapping (LUMA_CITY, EVENTBRITE_LOCATION, etc.)
 *
 * Les fonctions qui font des appels réseau (fetchAndFilter*, fetchMeetupEvents)
 * sont exclues de ces tests unitaires — elles appartiennent aux tests d'intégration.
 */

function makeEvent(overrides: Partial<EventResult> = {}): EventResult {
  return {
    title: "Tech Meetup",
    date: "2026-03-15",
    time: "19:00",
    location: "Paris",
    url: "https://lu.ma/tech-meetup",
    source: "luma",
    description: null,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────
// deduplicateByUrl
// ─────────────────────────────────────────────────────────────

describe("deduplicateByUrl", () => {
  describe("given an empty array", () => {
    it("should return an empty array", () => {
      expect(deduplicateByUrl([])).toEqual([]);
    });
  });

  describe("given events with unique URLs", () => {
    it("should return all events unchanged", () => {
      const events = [
        makeEvent({ url: "https://lu.ma/event-1" }),
        makeEvent({ url: "https://lu.ma/event-2" }),
        makeEvent({ url: "https://lu.ma/event-3" }),
      ];
      expect(deduplicateByUrl(events)).toHaveLength(3);
    });
  });

  describe("given events with duplicate URLs", () => {
    it("should keep only the first occurrence", () => {
      const events = [
        makeEvent({ url: "https://lu.ma/event-1", title: "First" }),
        makeEvent({ url: "https://lu.ma/event-1", title: "Duplicate" }),
        makeEvent({ url: "https://lu.ma/event-2" }),
      ];
      const result = deduplicateByUrl(events);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("First");
    });

    it("should handle all events having the same URL", () => {
      const events = [
        makeEvent({ url: "https://lu.ma/same", title: "First" }),
        makeEvent({ url: "https://lu.ma/same", title: "Second" }),
        makeEvent({ url: "https://lu.ma/same", title: "Third" }),
      ];
      const result = deduplicateByUrl(events);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("First");
    });
  });

  describe("given mixed sources with the same URL", () => {
    it("should deduplicate regardless of source", () => {
      const events = [
        makeEvent({ url: "https://example.com/event", source: "luma" }),
        makeEvent({ url: "https://example.com/event", source: "eventbrite" }),
      ];
      expect(deduplicateByUrl(events)).toHaveLength(1);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// buildEventbriteUrl
// ─────────────────────────────────────────────────────────────

describe("buildEventbriteUrl", () => {
  describe("given Paris with a keyword", () => {
    it("should build a valid Eventbrite URL", () => {
      const url = buildEventbriteUrl("paris", "2026-03-01", "2026-03-31", "javascript");
      expect(url).toContain("https://www.eventbrite.fr/d/");
      expect(url).toContain("france--paris");
    });

    it("should include the date range as query params", () => {
      const url = buildEventbriteUrl("paris", "2026-03-01", "2026-03-31", "tech");
      expect(url).toContain("start_date=2026-03-01");
      expect(url).toContain("end_date=2026-03-31");
    });

    it("should include the keyword as a query param", () => {
      const url = buildEventbriteUrl("paris", "2026-03-01", "2026-03-31", "javascript");
      expect(url).toContain("q=javascript");
    });
  });

  describe("given a keyword-free search", () => {
    it("should not include q= param when keyword is empty", () => {
      const url = buildEventbriteUrl("paris", "2026-03-01", "2026-03-31", "");
      expect(url).not.toContain("q=");
    });
  });

  describe("given different cities", () => {
    it.each([
      ["paris", "france--paris"],
      ["lyon", "france--lyon"],
      ["london", "united-kingdom--london"],
      ["berlin", "germany--berlin"],
      ["amsterdam", "netherlands--amsterdam"],
    ])(
      "should include the correct location slug for %s",
      (ville, expectedSlug) => {
        const url = buildEventbriteUrl(ville, "2026-03-01", "2026-03-31", "");
        expect(url).toContain(expectedSlug);
      }
    );
  });

  describe("given an unknown city", () => {
    it("should use a fallback location pattern", () => {
      const url = buildEventbriteUrl("bordeaux-unknown", "2026-03-01", "2026-03-31", "");
      expect(url).toContain("https://www.eventbrite.fr/d/");
      expect(url).toContain("france--");
    });
  });
});

// ─────────────────────────────────────────────────────────────
// getWeekRange
// ─────────────────────────────────────────────────────────────

describe("getWeekRange", () => {
  describe("given a Monday", () => {
    it("should return Monday as weekFrom and Sunday as weekTo", () => {
      // 2026-03-02 is a Monday
      const result = getWeekRange("2026-03-02");
      expect(result.weekFrom).toBe("2026-03-02");
      expect(result.weekTo).toBe("2026-03-08");
    });
  });

  describe("given a Wednesday", () => {
    it("should return the preceding Monday as weekFrom", () => {
      // 2026-03-04 is a Wednesday → week starts 2026-03-02
      const result = getWeekRange("2026-03-04");
      expect(result.weekFrom).toBe("2026-03-02");
      expect(result.weekTo).toBe("2026-03-08");
    });
  });

  describe("given a Sunday", () => {
    it("should return the preceding Monday as weekFrom", () => {
      // 2026-03-08 is a Sunday → week starts 2026-03-02
      const result = getWeekRange("2026-03-08");
      expect(result.weekFrom).toBe("2026-03-02");
      expect(result.weekTo).toBe("2026-03-08");
    });
  });

  describe("given a Saturday", () => {
    it("should return the preceding Monday as weekFrom and the next Sunday as weekTo", () => {
      // 2026-03-07 is a Saturday → week starts 2026-03-02
      const result = getWeekRange("2026-03-07");
      expect(result.weekFrom).toBe("2026-03-02");
      expect(result.weekTo).toBe("2026-03-08");
    });
  });

  describe("given a week that spans across a month boundary", () => {
    it("should handle month boundary correctly (March 30 – April 5)", () => {
      // 2026-03-30 is a Monday
      const result = getWeekRange("2026-04-01");
      expect(result.weekFrom).toBe("2026-03-30");
      expect(result.weekTo).toBe("2026-04-05");
    });
  });

  describe("output format", () => {
    it("should return dates in ISO YYYY-MM-DD format", () => {
      const result = getWeekRange("2026-03-04");
      expect(result.weekFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.weekTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should always return exactly 7 days between weekFrom and weekTo", () => {
      const result = getWeekRange("2026-03-04");
      const from = new Date(result.weekFrom);
      const to = new Date(result.weekTo);
      const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(6); // 6 days apart = 7-day week (Mon to Sun inclusive)
    });
  });
});

// ─────────────────────────────────────────────────────────────
// Meetup — fenêtre de recherche et conversion des résultats de l'API
// ─────────────────────────────────────────────────────────────

describe("meetupSearchWindow", () => {
  it("should widen the week by one day on each side, in UTC", () => {
    expect(meetupSearchWindow("2026-10-12", "2026-10-18")).toEqual({
      startDateRange: "2026-10-11T00:00:00Z",
      endDateRange: "2026-10-19T23:59:59Z",
    });
  });

  it("should cross month and year boundaries", () => {
    expect(meetupSearchWindow("2026-01-01", "2026-12-31")).toEqual({
      startDateRange: "2025-12-31T00:00:00Z",
      endDateRange: "2027-01-01T23:59:59Z",
    });
  });
});

const meetupNode = (id: string, overrides: Partial<MeetupEventNode> = {}): MeetupEventNode => ({
  title: `Meetup ${id}`,
  dateTime: "2026-10-14T19:00:00+02:00",
  eventType: "PHYSICAL",
  eventUrl: `https://www.meetup.com/groupe/events/${id}/`,
  description: "Une soirée produit",
  venue: { name: "Station F", city: "Paris" },
  ...overrides,
});

describe("meetupNodesToEvents", () => {
  describe("given in-person events of the requested week", () => {
    it("should convert them to radar events", () => {
      expect(meetupNodesToEvents([meetupNode("1")], "2026-10-12", "2026-10-18")).toEqual([
        {
          title: "Meetup 1",
          date: "2026-10-14",
          time: "19:00",
          location: "Station F",
          url: "https://www.meetup.com/groupe/events/1/",
          source: "meetup",
          description: "Une soirée produit",
        },
      ]);
    });

    it("should fall back on the venue city, then on no location", () => {
      const events = meetupNodesToEvents(
        [meetupNode("1", { venue: { city: "Paris" } }), meetupNode("2", { venue: null })],
        "2026-10-12",
        "2026-10-18"
      );
      expect(events.map((e) => e.location)).toEqual(["Paris", null]);
    });
  });

  describe("given events to filter out", () => {
    it.each([
      ["online", { eventType: "ONLINE" }],
      ["without URL", { eventUrl: undefined }],
      ["before the week (local date, widened API window)", { dateTime: "2026-10-11T23:30:00+02:00" }],
      ["after the week", { dateTime: "2026-10-19T08:00:00+02:00" }],
    ])("should skip an event %s", (_, overrides) => {
      expect(meetupNodesToEvents([meetupNode("1", overrides)], "2026-10-12", "2026-10-18")).toEqual([]);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// extractEventbriteEvents — lecture du JSON-LD de la page
// ─────────────────────────────────────────────────────────────

function eventbritePage(...blocks: unknown[]): string {
  return blocks.map((b) => `<script type="application/ld+json">${JSON.stringify(b)}</script>`).join("");
}

const eventbriteEvent = (name: string, overrides: Record<string, unknown> = {}) => ({
  "@type": "Event",
  name,
  startDate: "2026-10-14T19:00:00+02:00",
  url: `https://www.eventbrite.fr/e/${name}`,
  location: { name: "Station F", address: { addressLocality: "Paris", addressRegion: "IDF", addressCountry: "FR" } },
  ...overrides,
});

describe("extractEventbriteEvents", () => {
  const extract = (html: string) =>
    extractEventbriteEvents(html, "2026-10-12", "2026-10-18", LUMA_LOCATION_TERMS.paris, "fr");

  describe("given events wrapped in an ItemList (current page format)", () => {
    it("should read the events of the list", () => {
      const html = eventbritePage({
        "@type": "ItemList",
        itemListElement: [{ item: eventbriteEvent("a") }, { item: eventbriteEvent("b") }],
      });
      expect(extract(html).map((e) => e.title)).toEqual(["a", "b"]);
    });
  });

  describe("given events laid flat (previous page format)", () => {
    it("should still read them", () => {
      expect(extract(eventbritePage([eventbriteEvent("a")])).map((e) => e.title)).toEqual(["a"]);
    });
  });

  describe("given events to filter out", () => {
    it.each([
      ["out of the week", { startDate: "2026-10-25T19:00:00+02:00" }],
      ["online", { eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode" }],
      ["in another country", { location: { address: { addressLocality: "Paris", addressCountry: "US" } } }],
    ])("should skip an event %s", (_, overrides) => {
      const html = eventbritePage({ "@type": "ItemList", itemListElement: [{ item: eventbriteEvent("a", overrides) }] });
      expect(extract(html)).toEqual([]);
    });
  });

  describe("given an empty result list", () => {
    it("should return no event without warning", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(extract(eventbritePage({ "@type": "ItemList", itemListElement: [] }))).toEqual([]);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe("given a page without any event structure (Eventbrite changed its page)", () => {
    it("should warn", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(extract(eventbritePage({ "@type": "BreadcrumbList", itemListElement: [] }))).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("Eventbrite"));
      warn.mockRestore();
    });
  });
});

// ─────────────────────────────────────────────────────────────
// Constantes de mapping — vérification de complétude
// ─────────────────────────────────────────────────────────────

describe("LUMA_CITY mapping", () => {
  it("should map 'paris' to 'Paris'", () => {
    expect(LUMA_CITY["paris"]).toBe("Paris");
  });

  it("should map 'london' to 'London'", () => {
    expect(LUMA_CITY["london"]).toBe("London");
  });

  it("should contain all major French cities", () => {
    const frenchCities = ["paris", "lyon", "bordeaux", "marseille", "toulouse", "nantes", "lille", "strasbourg"];
    for (const city of frenchCities) {
      expect(LUMA_CITY).toHaveProperty(city);
    }
  });
});

describe("LUMA_LOCATION_TERMS mapping", () => {
  it("should provide location terms for Paris including île-de-france", () => {
    expect(LUMA_LOCATION_TERMS["paris"]).toContain("paris");
    expect(LUMA_LOCATION_TERMS["paris"]).toContain("île-de-france");
  });
});

describe("EVENTBRITE_LOCATION mapping", () => {
  it("should map paris to france--paris", () => {
    expect(EVENTBRITE_LOCATION["paris"]).toBe("france--paris");
  });

  it("should map london to united-kingdom--london", () => {
    expect(EVENTBRITE_LOCATION["london"]).toBe("united-kingdom--london");
  });
});

describe("EVENTBRITE_COUNTRY mapping", () => {
  it("should map french cities to 'fr'", () => {
    expect(EVENTBRITE_COUNTRY["paris"]).toBe("fr");
    expect(EVENTBRITE_COUNTRY["lyon"]).toBe("fr");
  });

  it("should map london to 'gb'", () => {
    expect(EVENTBRITE_COUNTRY["london"]).toBe("gb");
  });

  it("should map berlin to 'de'", () => {
    expect(EVENTBRITE_COUNTRY["berlin"]).toBe("de");
  });
});

describe("extractKeywordsAndCity", () => {
  const call = (answer: string | null) => async () => answer;

  it.each([
    ["a bare JSON answer", '{"keywords":["Product","Discovery"],"city":"Paris","country":"fr"}'],
    ["JSON wrapped in text", 'Voici :\n{"keywords":["Product","Discovery"],"city":"Paris","country":"fr"}\nFin.'],
  ])("should parse %s", async (_, answer) => {
    expect(await extractKeywordsAndCity(call(answer), "t", "", "", "")).toEqual({
      keywords: ["Product", "Discovery"],
      city: "Paris",
      country: "fr",
    });
  });

  it.each([
    ["no answer (refusal or empty response)", null],
    ["an unparseable answer", "pas de JSON"],
  ])("should return empty results given %s", async (_, answer) => {
    expect(await extractKeywordsAndCity(call(answer), "t", "", "", "")).toEqual({
      keywords: [],
      city: null,
      country: null,
    });
  });
});

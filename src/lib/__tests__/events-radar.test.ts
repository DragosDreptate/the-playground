import { describe, it, expect } from "vitest";
import {
  deduplicateByUrl,
  buildEventbriteUrl,
  buildMeetupUrl,
  getWeekRange,
  extractMeetupData,
  LUMA_CITY,
  LUMA_LOCATION_TERMS,
  EVENTBRITE_LOCATION,
  EVENTBRITE_COUNTRY,
  MEETUP_LOCATION,
} from "@/lib/events-radar";
import type { EventResult } from "@/lib/events-radar";

/**
 * Tests — Fonctions pures de lib/events-radar.ts
 *
 * Seules les fonctions pures (sans I/O) sont testées ici :
 *   - deduplicateByUrl
 *   - buildEventbriteUrl
 *   - buildMeetupUrl
 *   - getWeekRange
 *   - extractMeetupData (extraction de HTML)
 *   - constantes de mapping (LUMA_CITY, EVENTBRITE_LOCATION, etc.)
 *
 * Les fonctions qui font des appels réseau (fetchAndFilter*, fetchMeetupData)
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
// buildMeetupUrl
// ─────────────────────────────────────────────────────────────

describe("buildMeetupUrl", () => {
  describe("given Paris with a keyword", () => {
    it("should build a valid Meetup URL", () => {
      const url = buildMeetupUrl("paris", "2026-03-01", "2026-03-31", "tech");
      expect(url).toContain("https://www.meetup.com/find/events/");
      expect(url).toContain("fr--Paris");
    });

    it("should include the date range", () => {
      const url = buildMeetupUrl("paris", "2026-03-01", "2026-03-31", "");
      expect(url).toContain("startDateRange=2026-03-01");
      expect(url).toContain("endDateRange=2026-03-31");
    });

    it("should include the source=EVENTS param", () => {
      const url = buildMeetupUrl("paris", "2026-03-01", "2026-03-31", "");
      expect(url).toContain("source=EVENTS");
    });

    it("should include the keyword when provided", () => {
      const url = buildMeetupUrl("paris", "2026-03-01", "2026-03-31", "javascript");
      expect(url).toContain("keywords=javascript");
    });
  });

  describe("given no keyword", () => {
    it("should not include keywords param when empty", () => {
      const url = buildMeetupUrl("paris", "2026-03-01", "2026-03-31", "");
      expect(url).not.toContain("keywords=");
    });
  });

  describe("given different cities", () => {
    it.each([
      ["paris", "fr--Paris"],
      ["lyon", "fr--Lyon"],
      ["london", "gb--London"],
      ["berlin", "de--Berlin"],
    ])(
      "should use the correct location for %s",
      (ville, expectedLocation) => {
        const url = buildMeetupUrl(ville, "2026-03-01", "2026-03-31", "");
        expect(url).toContain(expectedLocation);
      }
    );
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
// extractMeetupData — extraction depuis HTML
// ─────────────────────────────────────────────────────────────

describe("extractMeetupData", () => {
  describe("given empty HTML", () => {
    it("should return an empty string for empty input", () => {
      expect(extractMeetupData("")).toBe("");
    });
  });

  describe("given HTML without __NEXT_DATA__ or JSON-LD", () => {
    it("should return a stripped version of the HTML", () => {
      const html = "<html><body><h1>Hello World</h1></body></html>";
      const result = extractMeetupData(html);
      expect(result).toContain("Hello World");
      expect(result).not.toContain("<script");
      expect(result).not.toContain("<style");
    });

    it("should strip script tags", () => {
      const html = "<body><script>alert('xss')</script><p>Content</p></body>";
      const result = extractMeetupData(html);
      expect(result).not.toContain("alert");
      expect(result).toContain("Content");
    });
  });

  describe("given HTML with a valid __NEXT_DATA__ block containing eventResults", () => {
    it("should extract the event results data", () => {
      const eventData = { events: [{ name: "Tech Meetup" }] };
      const nextData = {
        props: {
          pageProps: {
            pagePayload: {
              eventResults: eventData,
            },
          },
        },
      };
      const html = `<html>
        <script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script>
        <body>Fallback content</body>
      </html>`;

      const result = extractMeetupData(html);
      expect(result).toContain("Tech Meetup");
    });
  });

  describe("given HTML with JSON-LD blocks", () => {
    it("should extract the JSON-LD structured data", () => {
      const jsonLd = { "@type": "Event", "name": "Design Workshop" };
      const html = `<html>
        <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
        <body>Page content</body>
      </html>`;

      const result = extractMeetupData(html);
      expect(result).toContain("Design Workshop");
    });
  });

  describe("given very long HTML (> 6000 chars without structured data)", () => {
    it("should truncate the output to avoid memory issues", () => {
      const longContent = "x".repeat(10000);
      const html = `<body>${longContent}</body>`;
      const result = extractMeetupData(html);
      // The result should be the truncated body (6000 chars limit for stripped HTML)
      expect(result.length).toBeLessThanOrEqual(6000);
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

describe("MEETUP_LOCATION mapping", () => {
  it("should map paris to fr--Paris", () => {
    expect(MEETUP_LOCATION["paris"]).toBe("fr--Paris");
  });

  it("should map london to gb--London", () => {
    expect(MEETUP_LOCATION["london"]).toBe("gb--London");
  });
});

import { describe, it, expect, vi } from "vitest";
import { generateIcs, generateIcsFeed } from "../generate-ics";

describe("generateIcs", () => {
  const defaultData = {
    uid: "moment-123",
    title: "Apéro Design #12",
    description: "Un moment convivial autour du design.",
    startsAt: new Date("2026-03-15T18:00:00Z"),
    endsAt: new Date("2026-03-15T20:00:00Z"),
    location: "Le Comptoir, 12 rue de Rivoli, Paris",
    url: "https://the-playground.fr/m/apero-design-12",
    organizerName: "Design & Produit Lyon",
  };

  describe("given a Moment with start and end dates", () => {
    it("should generate a valid iCalendar structure", () => {
      const ics = generateIcs(defaultData);

      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain("END:VCALENDAR");
      expect(ics).toContain("BEGIN:VEVENT");
      expect(ics).toContain("END:VEVENT");
      expect(ics).toContain("VERSION:2.0");
      expect(ics).toContain("PRODID:-//The Playground//EN");
      expect(ics).toContain("CALSCALE:GREGORIAN");
      expect(ics).toContain("METHOD:PUBLISH");
    });

    it("should include the correct event details", () => {
      const ics = generateIcs(defaultData);

      expect(ics).toContain("UID:moment-123@theplayground");
      expect(ics).toContain("DTSTART:20260315T180000Z");
      expect(ics).toContain("DTEND:20260315T200000Z");
      expect(ics).toContain("SUMMARY:Apéro Design #12");
      expect(ics).toContain(
        "DESCRIPTION:Un moment convivial autour du design."
      );
      expect(ics).toContain(
        "LOCATION:Le Comptoir\\, 12 rue de Rivoli\\, Paris"
      );
      expect(ics).toContain(
        "URL:https://the-playground.fr/m/apero-design-12"
      );
      expect(ics).toContain("STATUS:CONFIRMED");
    });

    it("should include the organizer with Circle name", () => {
      const ics = generateIcs(defaultData);

      expect(ics).toContain(
        "ORGANIZER;CN=Design & Produit Lyon:MAILTO:hello@the-playground.fr"
      );
    });

    it("should use CRLF line endings (RFC 5545)", () => {
      const ics = generateIcs(defaultData);

      expect(ics).toContain("\r\n");
      const lines = ics.split("\r\n");
      expect(lines[0]).toBe("BEGIN:VCALENDAR");
      expect(lines[lines.length - 1]).toBe("END:VCALENDAR");
    });
  });

  describe("given a Moment without an end date", () => {
    it("should default to startsAt + 2 hours", () => {
      const ics = generateIcs({ ...defaultData, endsAt: null });

      expect(ics).toContain("DTSTART:20260315T180000Z");
      expect(ics).toContain("DTEND:20260315T200000Z");
    });
  });

  describe("given text with special characters", () => {
    it.each([
      {
        field: "title",
        input: "Meet & Greet; Welcome, Everyone",
        expected: "SUMMARY:Meet & Greet\\; Welcome\\, Everyone",
      },
      {
        field: "description",
        input: "Line 1\nLine 2\nLine 3",
        expected: "DESCRIPTION:Line 1\\nLine 2\\nLine 3",
      },
      {
        field: "location",
        input: "Salle A, 2ème étage; Bât. C",
        expected: "LOCATION:Salle A\\, 2ème étage\\; Bât. C",
      },
      {
        field: "title",
        input: "Path\\to\\file",
        expected: "SUMMARY:Path\\\\to\\\\file",
      },
    ])(
      "should escape $field: $input",
      ({ field, input, expected }) => {
        const data = { ...defaultData, [field]: input };
        const ics = generateIcs(data);
        expect(ics).toContain(expected);
      }
    );
  });

  describe("given a Moment with a videoLink", () => {
    it("should use the video link as LOCATION instead of the text fallback", () => {
      const ics = generateIcs({
        ...defaultData,
        location: "En ligne",
        videoLink: "https://meet.google.com/abc-defg-hij",
      });

      expect(ics).toContain(
        "LOCATION:https://meet.google.com/abc-defg-hij"
      );
      expect(ics).not.toContain("LOCATION:En ligne");
    });

    it("should prepend the video link in DESCRIPTION for reliable persistence", () => {
      const ics = generateIcs({
        ...defaultData,
        location: "En ligne",
        videoLink: "https://meet.google.com/abc-defg-hij",
      });

      expect(ics).toContain(
        "DESCRIPTION:Rejoindre : https://meet.google.com/abc-defg-hij\\n\\n"
      );
    });

    it("should add a CONFERENCE property with the video link", () => {
      const ics = generateIcs({
        ...defaultData,
        location: "En ligne",
        videoLink: "https://meet.google.com/abc-defg-hij",
      });

      expect(ics).toContain(
        'CONFERENCE;FEATURE=VIDEO;LABEL="Lien de réunion";VALUE=URI:https://meet.google.com/abc-defg-hij'
      );
    });

    it("should work for Zoom links", () => {
      const ics = generateIcs({
        ...defaultData,
        location: "En ligne",
        videoLink: "https://zoom.us/j/98765432100",
      });

      expect(ics).toContain("LOCATION:https://zoom.us/j/98765432100");
      expect(ics).toContain("DESCRIPTION:Rejoindre : https://zoom.us/j/98765432100\\n\\n");
      expect(ics).toContain(
        'CONFERENCE;FEATURE=VIDEO;LABEL="Lien de réunion";VALUE=URI:https://zoom.us/j/98765432100'
      );
    });

    it("should not add CONFERENCE when videoLink is absent", () => {
      const ics = generateIcs(defaultData);

      expect(ics).not.toContain("CONFERENCE");
    });

    it("should not add CONFERENCE when videoLink is null", () => {
      const ics = generateIcs({ ...defaultData, videoLink: null });

      expect(ics).not.toContain("CONFERENCE");
    });

    it("should not prepend 'Rejoindre' in DESCRIPTION when videoLink is absent", () => {
      const ics = generateIcs(defaultData);

      expect(ics).not.toContain("Rejoindre");
      expect(ics).toContain(
        "DESCRIPTION:Un moment convivial autour du design."
      );
    });

    it("should use the text location when videoLink is absent", () => {
      const ics = generateIcs(defaultData);

      expect(ics).toContain(
        "LOCATION:Le Comptoir\\, 12 rue de Rivoli\\, Paris"
      );
    });
  });

  describe("given a DTSTAMP", () => {
    it("should include a DTSTAMP with current time", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-02-21T22:00:00Z"));

      const ics = generateIcs(defaultData);
      expect(ics).toContain("DTSTAMP:20260221T220000Z");

      vi.useRealTimers();
    });
  });
});

describe("generateIcsFeed", () => {
  const event = {
    uid: "moment-1",
    title: "Apéro JS #42",
    description: "Inscription : https://the-playground.fr/m/apero-js-42",
    startsAt: new Date("2026-11-27T18:00:00Z"),
    endsAt: new Date("2026-11-27T20:00:00Z"),
    location: "La Cantine, Toulouse",
    url: "https://the-playground.fr/m/apero-js-42",
    cancelled: false,
    updatedAt: new Date("2026-11-10T09:15:00Z"),
  };

  function unfold(ics: string): string {
    return ics.replace(/\r\n /g, "");
  }

  describe("given a Community calendar with several events", () => {
    it("should wrap one VEVENT per event in a single VCALENDAR", () => {
      const ics = generateIcsFeed({
        calendarName: "Toulouse JS · The Playground",
        events: [event, { ...event, uid: "moment-2" }],
      });

      expect(ics.match(/BEGIN:VCALENDAR/g)).toHaveLength(1);
      expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
      expect(ics).toContain("UID:moment-1@theplayground");
      expect(ics).toContain("UID:moment-2@theplayground");
      expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    });

    it("should name the calendar and suggest an hourly refresh", () => {
      const ics = generateIcsFeed({
        calendarName: "Toulouse JS · The Playground",
        events: [],
      });

      expect(ics).toContain("METHOD:PUBLISH");
      expect(ics).toContain("NAME:Toulouse JS · The Playground");
      expect(ics).toContain("X-WR-CALNAME:Toulouse JS · The Playground");
      expect(ics).toContain("REFRESH-INTERVAL;VALUE=DURATION:PT1H");
      expect(ics).toContain("X-PUBLISHED-TTL:PT1H");
    });

    it("should never expose an organizer email", () => {
      const ics = generateIcsFeed({ calendarName: "Toulouse JS", events: [event] });

      expect(ics).not.toContain("ORGANIZER");
      expect(ics).not.toContain("MAILTO");
    });
  });

  describe.each([
    [false, "STATUS:CONFIRMED"],
    [true, "STATUS:CANCELLED"],
  ])("given an event with cancelled=%s", (cancelled, expected) => {
    it(`should mark it ${expected}`, () => {
      const ics = generateIcsFeed({
        calendarName: "Toulouse JS",
        events: [{ ...event, cancelled }],
      });

      expect(ics).toContain(expected);
    });
  });

  describe("given an event modified after publication", () => {
    it("should expose its last modification date", () => {
      const ics = generateIcsFeed({ calendarName: "Toulouse JS", events: [event] });

      expect(ics).toContain("LAST-MODIFIED:20261110T091500Z");
    });
  });

  describe("given a description with invisible control characters", () => {
    it("should drop them and keep tabs and line breaks", () => {
      const ics = generateIcsFeed({
        calendarName: "Toulouse JS",
        events: [{ ...event, description: "A\u000BB\u000CC\u0000D\u007FE\tF\nG" }],
      });

      expect(unfold(ics)).toContain("DESCRIPTION:ABCDE\tF\\nG");
    });
  });

  describe("given an event without location", () => {
    it("should omit the LOCATION line", () => {
      const ics = generateIcsFeed({
        calendarName: "Toulouse JS",
        events: [{ ...event, location: null }],
      });

      expect(ics).not.toContain("LOCATION:");
    });
  });

  describe("given an event without end date", () => {
    it("should end two hours after the start", () => {
      const ics = generateIcsFeed({
        calendarName: "Toulouse JS",
        events: [{ ...event, endsAt: null }],
      });

      expect(ics).toContain("DTEND:20261127T200000Z");
    });
  });

  describe("given a description typed with Windows line endings", () => {
    it("should escape it without leaving a raw carriage return", () => {
      const ics = generateIcsFeed({
        calendarName: "Toulouse JS",
        events: [{ ...event, description: "Ligne 1\r\nLigne 2" }],
      });

      expect(unfold(ics)).toContain("DESCRIPTION:Ligne 1\\nLigne 2");
      expect(ics.replace(/\r\n/g, "")).not.toContain("\r");
    });
  });

  describe("given a long accented description", () => {
    const description = "Événement à Toulouse — ".repeat(20);
    const ics = generateIcsFeed({
      calendarName: "Toulouse JS",
      events: [{ ...event, description }],
    });

    it("should fold every line to 75 bytes at most (RFC 5545)", () => {
      const encoder = new TextEncoder();
      for (const line of ics.split("\r\n")) {
        expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
      }
    });

    it("should restore the full text once unfolded", () => {
      expect(unfold(ics)).toContain(`DESCRIPTION:${description}`);
    });
  });
});

import { describe, it, expect, vi } from "vitest";
import { generateIcs } from "../generate-ics";

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
        "ORGANIZER;CN=Design & Produit Lyon:MAILTO:noreply@theplayground.community"
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

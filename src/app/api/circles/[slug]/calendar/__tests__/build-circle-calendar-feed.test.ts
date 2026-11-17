import { describe, it, expect } from "vitest";
import type { LocationType } from "@/domain/models/moment";
import { makeMoment } from "@/domain/usecases/__tests__/helpers/mock-moment-repository";
import {
  buildCircleCalendarFeed,
  momentPublicUrl,
} from "../build-circle-calendar-feed";

const APP_URL = "https://the-playground.fr";
const labels = {
  registerLine: (url: string) => `Inscription : ${url}`,
  online: "En ligne",
};

function build(moment: ReturnType<typeof makeMoment>, locale: "fr" | "en" = "fr") {
  const ics = buildCircleCalendarFeed({
    circleName: "Toulouse JS",
    moments: [moment],
    appUrl: APP_URL,
    locale,
    labels,
  });
  // Déplie les lignes (RFC 5545) pour asserter sur le texte complet.
  return ics.replace(/\r\n /g, "");
}

describe("buildCircleCalendarFeed", () => {
  describe("given a Community", () => {
    it("should name the calendar after it, with the platform mention", () => {
      const ics = build(makeMoment());

      expect(ics).toContain("X-WR-CALNAME:Toulouse JS · The Playground");
    });
  });

  describe("given a Moment with a description", () => {
    it("should put the registration link first, then the description", () => {
      const ics = build(
        makeMoment({ slug: "apero-js-42", description: "On parle des signals." })
      );

      expect(ics).toContain(
        "DESCRIPTION:Inscription : https://the-playground.fr/m/apero-js-42\\n\\nOn parle des signals."
      );
      expect(ics).toContain("URL:https://the-playground.fr/m/apero-js-42");
    });
  });

  describe("given a Moment without description", () => {
    it("should keep only the registration link", () => {
      const ics = build(makeMoment({ slug: "apero-js-42", description: "  " }));

      expect(ics).toContain(
        "DESCRIPTION:Inscription : https://the-playground.fr/m/apero-js-42\r\n"
      );
    });
  });

  describe.each<[string, LocationType, string | null, string | null, string | null]>([
    ["an in-person Moment", "IN_PERSON", "La Cantine", "27 rue d'Aubuisson", "La Cantine\\, 27 rue d'Aubuisson"],
    ["an in-person Moment without address", "IN_PERSON", null, null, null],
    ["an online Moment", "ONLINE", null, null, "En ligne"],
    ["a hybrid Moment", "HYBRID", "La Cantine", null, "La Cantine"],
    ["a hybrid Moment without address", "HYBRID", null, null, "En ligne"],
  ])("given %s", (_label, locationType, locationName, locationAddress, expected) => {
    it(`should show ${expected ?? "no location"}`, () => {
      const ics = build(makeMoment({ locationType, locationName, locationAddress }));

      if (expected) {
        expect(ics).toContain(`LOCATION:${expected}`);
      } else {
        expect(ics).not.toContain("LOCATION:");
      }
    });
  });

  describe("given an online Moment with a video link", () => {
    it("should never expose the video link", () => {
      const ics = build(
        makeMoment({ locationType: "ONLINE", videoLink: "https://meet.example.com/secret" })
      );

      expect(ics).not.toContain("meet.example.com");
    });
  });

  describe("given a Moment updated after publication", () => {
    it("should carry its last modification date", () => {
      const ics = build(makeMoment({ updatedAt: new Date("2026-11-10T09:15:00Z") }));

      expect(ics).toContain("LAST-MODIFIED:20261110T091500Z");
    });
  });

  describe("given a cancelled Moment", () => {
    it("should keep it, marked as cancelled", () => {
      const ics = build(makeMoment({ status: "CANCELLED" }));

      expect(ics).toContain("STATUS:CANCELLED");
    });
  });
});

describe("momentPublicUrl", () => {
  it.each([
    ["fr", "https://the-playground.fr/m/apero"],
    ["en", "https://the-playground.fr/en/m/apero"],
  ] as const)("should build the %s event URL, prefixed only outside the default locale", (locale, expected) => {
    expect(momentPublicUrl(APP_URL, locale, "apero")).toBe(expected);
  });
});

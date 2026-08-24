import { describe, it, expect } from "vitest";
import { buildMomentEmailContext, type MomentForEmail } from "../format-moment-email";

function makeMomentForEmail(overrides: Partial<MomentForEmail> = {}): MomentForEmail {
  return {
    // 15:30 UTC = 16:30 à Dublin (IST, UTC+1 en août), 17:30 à Paris (CEST, UTC+2)
    startsAt: new Date("2026-08-25T15:30:00.000Z"),
    timezone: "Europe/Dublin",
    locationType: "IN_PERSON",
    locationName: "The Sports Hub",
    locationAddress: "Dublin",
    videoLink: null,
    ...overrides,
  };
}

describe("buildMomentEmailContext", () => {
  describe("given an event outside the platform's historical timezone", () => {
    it("should render the time in the event timezone, not in Europe/Paris", () => {
      const ctx = buildMomentEmailContext(makeMomentForEmail(), "fr");

      expect(ctx.momentDate).toContain("16:30");
      expect(ctx.momentDate).not.toContain("17:30");
    });

    it("should name the timezone, since an email has no visitor to convert for", () => {
      const ctx = buildMomentEmailContext(makeMomentForEmail(), "fr");

      expect(ctx.momentDate).toContain("heure de Dublin");
    });

    it("should name the timezone in the recipient's locale", () => {
      const ctx = buildMomentEmailContext(makeMomentForEmail(), "en");

      expect(ctx.momentDate).toContain("Dublin time");
    });

    it("should derive the date badge from the event timezone too", () => {
      // 23:30 à Dublin le 25 = 22:30 UTC, soit déjà le 26 à Paris : la pastille de
      // date de l'email doit afficher le 25, le jour vécu sur place.
      const ctx = buildMomentEmailContext(
        makeMomentForEmail({ startsAt: new Date("2026-08-25T22:30:00.000Z") }),
        "fr",
      );

      expect(ctx.momentDateDay).toBe("25");
    });
  });

  describe("given an event in the platform's historical timezone", () => {
    it("should keep rendering Paris time, now explicitly labelled", () => {
      const ctx = buildMomentEmailContext(
        makeMomentForEmail({ timezone: "Europe/Paris" }),
        "fr",
      );

      expect(ctx.momentDate).toContain("17:30");
      expect(ctx.momentDate).toContain("heure de Paris");
    });
  });
});

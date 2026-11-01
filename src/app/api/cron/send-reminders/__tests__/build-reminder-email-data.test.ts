import { describe, it, expect } from "vitest";
import {
  buildMomentIcs,
  buildReminderEmailData,
  type ReminderStrings,
} from "../build-reminder-email-data";
import type { MomentForReminder } from "@/domain/ports/repositories/moment-repository";

const APP_URL = "https://the-playground.fr";

const FR_STRINGS: ReminderStrings = {
  subject: "Rappel : Weekly Meetup — demain",
  heading: "C'est demain ! Voici un rappel pour votre événement.",
  dateLabel: "Date",
  locationLabel: "Lieu",
  viewMomentCta: "Voir l'événement",
  footer: "Vous recevez ce rappel car vous êtes inscrit(e) à cet événement sur The Playground.",
};

const EN_STRINGS: ReminderStrings = {
  ...FR_STRINGS,
  subject: "Reminder: Weekly Meetup is tomorrow",
};

function makeMomentForReminder(
  overrides: Partial<MomentForReminder> = {}
): MomentForReminder {
  return {
    id: "moment-1",
    slug: "weekly-meetup",
    title: "Weekly Meetup",
    description: "A weekly community meetup.",
    startsAt: new Date("2026-03-16T18:00:00Z"),
    endsAt: new Date("2026-03-16T20:00:00Z"),
    timezone: "Europe/Paris",
    locationType: "IN_PERSON",
    locationName: "Café Central",
    locationAddress: null,
    videoLink: null,
    circle: { name: "Tech Paris", slug: "tech-paris" },
    registeredUsers: [],
    ...overrides,
  };
}

const user = { email: "alice@example.com", name: "Alice Dupont" };

describe("buildMomentIcs", () => {
  it("should generate valid ICS content with moment description", () => {
    const ics = buildMomentIcs(makeMomentForReminder(), APP_URL, "fr");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("Weekly Meetup");
    expect(ics).toContain("A weekly community meetup.");
    expect(ics).toContain("METHOD:PUBLISH");
  });

  it("should include moment URL", () => {
    const ics = buildMomentIcs(makeMomentForReminder(), APP_URL, "fr");
    expect(ics).toContain(`${APP_URL}/m/weekly-meetup`);
  });

  it("should localize the calendar location", () => {
    const moment = makeMomentForReminder({ locationType: "ONLINE", videoLink: null });
    expect(buildMomentIcs(moment, APP_URL, "en")).toContain("LOCATION:Online");
    expect(buildMomentIcs(moment, APP_URL, "fr")).toContain("LOCATION:En ligne");
  });
});

describe("buildReminderEmailData", () => {
  const moment = makeMomentForReminder();
  const icsContent = buildMomentIcs(moment, APP_URL, "fr");

  it("should set recipient email and name", () => {
    const data = buildReminderEmailData(moment, user, icsContent, "fr", FR_STRINGS);
    expect(data.to).toBe("alice@example.com");
    expect(data.playerName).toBe("Alice Dupont");
  });

  it("should fall back to email when user has no name", () => {
    const data = buildReminderEmailData(
      moment,
      { email: "bob@example.com", name: null },
      icsContent,
      "fr",
      FR_STRINGS
    );
    expect(data.playerName).toBe("bob@example.com");
  });

  it("should include moment and circle identifiers, strings and ICS", () => {
    const data = buildReminderEmailData(moment, user, icsContent, "fr", FR_STRINGS);
    expect(data.momentTitle).toBe("Weekly Meetup");
    expect(data.momentSlug).toBe("weekly-meetup");
    expect(data.circleName).toBe("Tech Paris");
    expect(data.circleSlug).toBe("tech-paris");
    expect(data.strings).toBe(FR_STRINGS);
    expect(data.icsContent).toBe(icsContent);
  });

  describe("given an event in Dublin, recipients in each language", () => {
    // 15:30 UTC = 16:30 à Dublin en août, 17:30 à Paris.
    const dublin = makeMomentForReminder({
      startsAt: new Date("2026-08-25T15:30:00.000Z"),
      timezone: "Europe/Dublin",
    });

    it.each([
      ["fr", "mardi 25 août 2026, 16:30 (heure de Dublin)", "AOÛT"],
      ["en", "Tuesday 25 August 2026, 16:30 (Dublin time)", "AUG"],
    ])("should render the date in the event timezone, in %s", (locale, date, month) => {
      const data = buildReminderEmailData(dublin, user, "ICS", locale, EN_STRINGS);
      expect(data.momentDate).toBe(date);
      expect(data.momentDateMonth).toBe(month);
      expect(data.momentDateDay).toBe("25");
    });
  });

  // Même mise en forme du lieu que les autres emails (buildMomentEmailContext).
  describe.each([
    ["IN_PERSON with name and address", { locationName: "Café Central", locationAddress: "1 rue de Paris" }, "Café Central, 1 rue de Paris", "Café Central, 1 rue de Paris"],
    ["IN_PERSON without place", { locationName: null }, "À définir", "TBD"],
    ["ONLINE with video link", { locationType: "ONLINE" as const, videoLink: "https://zoom.us/j/123" }, "https://zoom.us/j/123", "https://zoom.us/j/123"],
    ["ONLINE without video link", { locationType: "ONLINE" as const }, "En ligne", "Online"],
    ["HYBRID with name and address", { locationType: "HYBRID" as const, locationName: "Station F", locationAddress: "5 parvis" }, "Station F, 5 parvis", "Station F, 5 parvis"],
    ["HYBRID without place", { locationType: "HYBRID" as const, locationName: null }, "Hybride", "Hybrid"],
  ])("given a location %s", (_label, overrides, fr, en) => {
    it("should render it like the other emails, in each language", () => {
      const m = makeMomentForReminder(overrides);
      expect(buildReminderEmailData(m, user, "ICS", "fr", FR_STRINGS).locationText).toBe(fr);
      expect(buildReminderEmailData(m, user, "ICS", "en", EN_STRINGS).locationText).toBe(en);
    });
  });
});

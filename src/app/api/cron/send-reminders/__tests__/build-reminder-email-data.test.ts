import { describe, it, expect } from "vitest";
import {
  buildMomentIcs,
  buildReminderEmailData,
  formatLocationText,
} from "../build-reminder-email-data";
import type { MomentForReminder } from "@/domain/ports/repositories/moment-repository";

const APP_URL = "https://the-playground.fr";

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
    locationType: "IN_PERSON",
    locationName: "Café Central",
    videoLink: null,
    circle: { name: "Tech Paris", slug: "tech-paris" },
    registeredUsers: [],
    ...overrides,
  };
}

describe("formatLocationText", () => {
  it("should return videoLink for ONLINE event with video link", () => {
    const moment = makeMomentForReminder({
      locationType: "ONLINE",
      videoLink: "https://meet.google.com/abc",
    });
    expect(formatLocationText(moment)).toBe("https://meet.google.com/abc");
  });

  it("should return 'En ligne' for ONLINE event without video link", () => {
    const moment = makeMomentForReminder({ locationType: "ONLINE", videoLink: null });
    expect(formatLocationText(moment)).toBe("En ligne");
  });

  it("should return locationName for HYBRID event", () => {
    const moment = makeMomentForReminder({ locationType: "HYBRID", locationName: "Station F" });
    expect(formatLocationText(moment)).toBe("Station F");
  });

  it("should return 'Hybride' for HYBRID event without locationName", () => {
    const moment = makeMomentForReminder({ locationType: "HYBRID", locationName: null });
    expect(formatLocationText(moment)).toBe("Hybride");
  });

  it("should return locationName for IN_PERSON event", () => {
    const moment = makeMomentForReminder({ locationType: "IN_PERSON", locationName: "Café Central" });
    expect(formatLocationText(moment)).toBe("Café Central");
  });

  it("should return 'Lieu à confirmer' for IN_PERSON event without locationName", () => {
    const moment = makeMomentForReminder({ locationType: "IN_PERSON", locationName: null });
    expect(formatLocationText(moment)).toBe("Lieu à confirmer");
  });
});

describe("buildMomentIcs", () => {
  it("should generate valid ICS content with moment description", () => {
    const moment = makeMomentForReminder();
    const ics = buildMomentIcs(moment, APP_URL);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("Weekly Meetup");
    expect(ics).toContain("A weekly community meetup.");
    expect(ics).toContain("METHOD:PUBLISH");
  });

  it("should include moment URL", () => {
    const moment = makeMomentForReminder();
    const ics = buildMomentIcs(moment, APP_URL);
    expect(ics).toContain(`${APP_URL}/m/weekly-meetup`);
  });
});

describe("buildReminderEmailData", () => {
  const moment = makeMomentForReminder();
  const user = { email: "alice@example.com", name: "Alice Dupont" };
  const icsContent = buildMomentIcs(moment, APP_URL);

  it("should set recipient email and name", () => {
    const data = buildReminderEmailData(moment, user, icsContent);
    expect(data.to).toBe("alice@example.com");
    expect(data.playerName).toBe("Alice Dupont");
  });

  it("should fall back to email when user has no name", () => {
    const data = buildReminderEmailData(moment, { email: "bob@example.com", name: null }, icsContent);
    expect(data.playerName).toBe("bob@example.com");
  });

  it("should include moment title and slug", () => {
    const data = buildReminderEmailData(moment, user, icsContent);
    expect(data.momentTitle).toBe("Weekly Meetup");
    expect(data.momentSlug).toBe("weekly-meetup");
  });

  it("should include circle name and slug", () => {
    const data = buildReminderEmailData(moment, user, icsContent);
    expect(data.circleName).toBe("Tech Paris");
    expect(data.circleSlug).toBe("tech-paris");
  });

  it("should generate a subject containing the moment title", () => {
    const data = buildReminderEmailData(moment, user, icsContent);
    expect(data.strings.subject).toContain("Weekly Meetup");
  });

  it("should include the provided icsContent", () => {
    const data = buildReminderEmailData(moment, user, icsContent);
    expect(data.icsContent).toBe(icsContent);
    expect(data.icsContent).toContain("BEGIN:VCALENDAR");
  });

  it("should include calendar badge fields (month and day)", () => {
    const data = buildReminderEmailData(moment, user, icsContent);
    expect(data.momentDateMonth).toBeTruthy();
    expect(data.momentDateDay).toBeTruthy();
  });

  it("should format IN_PERSON location correctly", () => {
    const data = buildReminderEmailData(moment, user, icsContent);
    expect(data.locationText).toBe("Café Central");
  });

  it("should format ONLINE location with video link", () => {
    const onlineMoment = makeMomentForReminder({
      locationType: "ONLINE",
      videoLink: "https://zoom.us/j/123",
    });
    const ics = buildMomentIcs(onlineMoment, APP_URL);
    const data = buildReminderEmailData(onlineMoment, user, ics);
    expect(data.locationText).toBe("https://zoom.us/j/123");
  });
});

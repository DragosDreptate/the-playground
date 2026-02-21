import { describe, it, expect } from "vitest";
import { getUserPastMoments } from "@/domain/usecases/get-user-past-moments";
import {
  createMockRegistrationRepository,
  makeRegistration,
} from "./helpers/mock-registration-repository";
import type { RegistrationWithMoment } from "@/domain/models/registration";

function makeRegistrationWithMoment(
  overrides: Partial<RegistrationWithMoment> = {}
): RegistrationWithMoment {
  return {
    ...makeRegistration(),
    moment: {
      id: "moment-1",
      slug: "past-meetup",
      title: "Past Meetup",
      startsAt: new Date("2026-01-15T18:00:00Z"),
      endsAt: new Date("2026-01-15T20:00:00Z"),
      locationType: "IN_PERSON",
      locationName: "Café Central",
      circleName: "Tech Paris",
      circleSlug: "tech-paris",
    },
    ...overrides,
  };
}

describe("GetUserPastMoments", () => {
  describe("given a user with past registrations", () => {
    it("should return all past registrations with moment data", async () => {
      const pastRegistrations: RegistrationWithMoment[] = [
        makeRegistrationWithMoment({
          id: "reg-1",
          status: "CHECKED_IN",
          moment: {
            id: "moment-1",
            slug: "yoga-jan",
            title: "Yoga Session January",
            startsAt: new Date("2026-01-10T10:00:00Z"),
            endsAt: new Date("2026-01-10T11:00:00Z"),
            locationType: "IN_PERSON",
            locationName: "Studio Zen",
            circleName: "Yoga Circle",
            circleSlug: "yoga-circle",
          },
        }),
        makeRegistrationWithMoment({
          id: "reg-2",
          status: "REGISTERED",
          moment: {
            id: "moment-2",
            slug: "coding-feb",
            title: "Coding Meetup February",
            startsAt: new Date("2026-02-05T18:00:00Z"),
            endsAt: null,
            locationType: "ONLINE",
            locationName: null,
            circleName: "Dev Community",
            circleSlug: "dev-community",
          },
        }),
      ];
      const registrationRepository = createMockRegistrationRepository({
        findPastByUserId: async () => pastRegistrations,
      });

      const result = await getUserPastMoments("user-1", {
        registrationRepository,
      });

      expect(result).toHaveLength(2);
      expect(result[0].moment.title).toBe("Yoga Session January");
      expect(result[0].status).toBe("CHECKED_IN");
      expect(result[1].moment.title).toBe("Coding Meetup February");
      expect(result[1].moment.locationType).toBe("ONLINE");
    });
  });

  describe("given a user with no past registrations", () => {
    it("should return an empty array", async () => {
      const registrationRepository = createMockRegistrationRepository({
        findPastByUserId: async () => [],
      });

      const result = await getUserPastMoments("user-1", {
        registrationRepository,
      });

      expect(result).toEqual([]);
    });
  });

  describe("given the userId is passed to the repository", () => {
    it("should call findPastByUserId with the correct userId", async () => {
      let capturedUserId: string | undefined;
      const registrationRepository = createMockRegistrationRepository({
        findPastByUserId: async (userId: string) => {
          capturedUserId = userId;
          return [];
        },
      });

      await getUserPastMoments("user-42", { registrationRepository });

      expect(capturedUserId).toBe("user-42");
    });
  });

  describe("given an online past Moment", () => {
    it("should return registration with ONLINE locationType and null locationName", async () => {
      const registration = makeRegistrationWithMoment({
        moment: {
          id: "moment-3",
          slug: "webinar-online",
          title: "Online Webinar",
          startsAt: new Date("2026-01-20T14:00:00Z"),
          endsAt: new Date("2026-01-20T15:00:00Z"),
          locationType: "ONLINE",
          locationName: null,
          circleName: "Remote Circle",
          circleSlug: "remote-circle",
        },
      });
      const registrationRepository = createMockRegistrationRepository({
        findPastByUserId: async () => [registration],
      });

      const result = await getUserPastMoments("user-1", {
        registrationRepository,
      });

      expect(result[0].moment.locationType).toBe("ONLINE");
      expect(result[0].moment.locationName).toBeNull();
    });
  });
});

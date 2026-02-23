import { describe, it, expect } from "vitest";
import { getUserUpcomingMoments } from "@/domain/usecases/get-user-upcoming-moments";
import {
  createMockRegistrationRepository,
  makeRegistration,
} from "./helpers/mock-registration-repository";
import type { RegistrationWithMoment } from "@/domain/models/registration";

describe("GetUserUpcomingMoments", () => {
  describe("given the user has upcoming registrations", () => {
    it("should return registrations with moment and circle data", async () => {
      const registrations: RegistrationWithMoment[] = [
        {
          ...makeRegistration({ id: "reg-1", status: "REGISTERED" }),
          moment: {
            id: "moment-1",
            slug: "yoga-session",
            title: "Yoga Session",
            coverImage: null,
            startsAt: new Date("2026-03-01T10:00:00Z"),
            endsAt: new Date("2026-03-01T11:00:00Z"),
            locationType: "IN_PERSON",
            locationName: "Studio Zen",
            circleName: "Yoga Circle",
            circleSlug: "yoga-circle",
            circleCoverImage: null,
          },
        },
        {
          ...makeRegistration({ id: "reg-2", status: "WAITLISTED" }),
          moment: {
            id: "moment-2",
            slug: "coding-meetup",
            title: "Coding Meetup",
            coverImage: null,
            startsAt: new Date("2026-03-05T18:00:00Z"),
            endsAt: null,
            locationType: "ONLINE",
            locationName: null,
            circleName: "Dev Community",
            circleSlug: "dev-community",
            circleCoverImage: null,
          },
        },
      ];
      const registrationRepository = createMockRegistrationRepository({
        findUpcomingByUserId: async () => registrations,
      });

      const result = await getUserUpcomingMoments("user-1", { registrationRepository });

      expect(result).toHaveLength(2);
      expect(result[0].moment.title).toBe("Yoga Session");
      expect(result[0].moment.circleName).toBe("Yoga Circle");
      expect(result[0].status).toBe("REGISTERED");
      expect(result[1].moment.title).toBe("Coding Meetup");
      expect(result[1].status).toBe("WAITLISTED");
    });
  });

  describe("given the user has no upcoming registrations", () => {
    it("should return an empty array", async () => {
      const registrationRepository = createMockRegistrationRepository();

      const result = await getUserUpcomingMoments("user-1", { registrationRepository });

      expect(result).toEqual([]);
    });
  });
});

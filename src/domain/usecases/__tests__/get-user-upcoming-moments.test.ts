import { describe, it, expect, vi } from "vitest";
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

  describe("given the userId is passed to the repository", () => {
    it("should call findUpcomingByUserId with the correct userId", async () => {
      let capturedUserId: string | undefined;
      const registrationRepository = createMockRegistrationRepository({
        findUpcomingByUserId: vi.fn().mockImplementation((userId: string) => {
          capturedUserId = userId;
          return Promise.resolve([]);
        }),
      });

      await getUserUpcomingMoments("user-42", { registrationRepository });

      expect(capturedUserId).toBe("user-42");
    });
  });

  describe("given a WAITLISTED registration", () => {
    it("should return the registration with WAITLISTED status", async () => {
      const registrations: RegistrationWithMoment[] = [
        {
          ...makeRegistration({ id: "reg-waitlist", status: "WAITLISTED" }),
          moment: {
            id: "moment-1",
            slug: "popular-meetup",
            title: "Popular Meetup",
            coverImage: null,
            startsAt: new Date("2026-04-01T18:00:00Z"),
            endsAt: null,
            locationType: "IN_PERSON",
            locationName: "Grand Amphithéâtre",
            circleName: "Popular Circle",
            circleSlug: "popular-circle",
            circleCoverImage: null,
          },
        },
      ];
      const registrationRepository = createMockRegistrationRepository({
        findUpcomingByUserId: vi.fn().mockResolvedValue(registrations),
      });

      const result = await getUserUpcomingMoments("user-1", { registrationRepository });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("WAITLISTED");
      expect(result[0].moment.title).toBe("Popular Meetup");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Sécurité — Isolation multi-tenant (IDOR)
  //
  // Ce usecase ne contient pas de garde d'autorisation interne.
  // L'isolation repose sur deux invariants :
  //   1. L'appelant (page/action) fournit `session.user.id`
  //      (jamais un paramètre fourni par l'utilisateur)
  //   2. Le repository scope toutes les requêtes sur `userId`
  //      (findUpcomingByUserId filtre WHERE userId = ?)
  //
  // Ces tests vérifient que le usecase propage le userId tel
  // quel au repository, sans substitution ni contamination
  // croisée entre utilisateurs.
  // ─────────────────────────────────────────────────────────────

  describe("Security — multi-tenant isolation (IDOR)", () => {
    it("should call findUpcomingByUserId with the exact userId provided — no substitution", async () => {
      const registrationRepository = createMockRegistrationRepository({
        findUpcomingByUserId: vi.fn().mockResolvedValue([]),
      });

      await getUserUpcomingMoments("user-alice", { registrationRepository });

      expect(registrationRepository.findUpcomingByUserId).toHaveBeenCalledWith("user-alice");
      expect(registrationRepository.findUpcomingByUserId).toHaveBeenCalledTimes(1);
    });

    it("should NOT call findUpcomingByUserId with any userId other than the one provided", async () => {
      const registrationRepository = createMockRegistrationRepository({
        findUpcomingByUserId: vi.fn().mockResolvedValue([]),
      });

      await getUserUpcomingMoments("user-attacker", { registrationRepository });

      expect(registrationRepository.findUpcomingByUserId).not.toHaveBeenCalledWith("user-victim");
      expect(registrationRepository.findUpcomingByUserId).toHaveBeenCalledWith("user-attacker");
    });

    it("should return only the data scoped to the provided userId — no data leakage", async () => {
      const aliceRegistrations: RegistrationWithMoment[] = [
        {
          ...makeRegistration({ id: "reg-alice", userId: "user-alice", status: "REGISTERED" }),
          moment: {
            id: "moment-alice",
            slug: "alice-meetup",
            title: "Alice Meetup",
            coverImage: null,
            startsAt: new Date("2026-05-01T18:00:00Z"),
            endsAt: null,
            locationType: "IN_PERSON",
            locationName: "Paris",
            circleName: "Alice Circle",
            circleSlug: "alice-circle",
            circleCoverImage: null,
          },
        },
      ];

      const registrationRepository = createMockRegistrationRepository({
        findUpcomingByUserId: vi.fn().mockImplementation((uid: string) => {
          if (uid === "user-alice") return Promise.resolve(aliceRegistrations);
          return Promise.resolve([]); // user-bob voit 0 inscriptions
        }),
      });

      const aliceResult = await getUserUpcomingMoments("user-alice", { registrationRepository });
      const bobResult = await getUserUpcomingMoments("user-bob", { registrationRepository });

      expect(aliceResult).toHaveLength(1);
      expect(aliceResult[0].moment.title).toBe("Alice Meetup");
      expect(bobResult).toHaveLength(0);
    });

    it("should propagate distinct userIds correctly for concurrent calls — no cross-contamination", async () => {
      const calls: string[] = [];
      const registrationRepository = createMockRegistrationRepository({
        findUpcomingByUserId: vi.fn().mockImplementation((uid: string) => {
          calls.push(uid);
          return Promise.resolve([]);
        }),
      });

      await Promise.all([
        getUserUpcomingMoments("user-alice", { registrationRepository }),
        getUserUpcomingMoments("user-bob", { registrationRepository }),
        getUserUpcomingMoments("user-carol", { registrationRepository }),
      ]);

      // Chaque userId est transmis exactement une fois, sans mélange
      expect(calls.filter((id) => id === "user-alice")).toHaveLength(1);
      expect(calls.filter((id) => id === "user-bob")).toHaveLength(1);
      expect(calls.filter((id) => id === "user-carol")).toHaveLength(1);
      expect(calls).toHaveLength(3);
    });
  });
});

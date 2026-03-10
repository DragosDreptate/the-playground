import { describe, it, expect, vi } from "vitest";
import { getUserPublicProfile } from "@/domain/usecases/get-user-public-profile";
import {
  createMockUserRepository,
  makePublicUser,
} from "./helpers/mock-user-repository";
import { createMockCircleRepository } from "./helpers/mock-circle-repository";
import { createMockMomentRepository } from "./helpers/mock-moment-repository";
import type { PublicCircleMembership, PublicMomentRegistration } from "@/domain/models/user";

const PUBLIC_ID = "jean-dupont-4821";
const INTERNAL_USER_ID = "user-123";

function makeDeps(
  overrides: {
    publicUser?: ReturnType<typeof makePublicUser> | null;
    internalUserId?: string | null;
    circles?: PublicCircleMembership[];
    moments?: PublicMomentRegistration[];
  } = {}
) {
  const publicUser = overrides.publicUser !== undefined ? overrides.publicUser : makePublicUser();
  const internalUserId = overrides.internalUserId !== undefined ? overrides.internalUserId : INTERNAL_USER_ID;

  const resolved = publicUser && internalUserId ? { user: publicUser, internalUserId } : null;

  return {
    userRepository: createMockUserRepository({
      resolvePublicProfile: vi.fn().mockResolvedValue(resolved),
    }),
    circleRepository: createMockCircleRepository({
      getPublicCirclesForUser: vi.fn().mockResolvedValue(overrides.circles ?? []),
    }),
    momentRepository: createMockMomentRepository({
      getUpcomingPublicMomentsForUser: vi.fn().mockResolvedValue(overrides.moments ?? []),
    }),
  };
}

describe("GetUserPublicProfile", () => {
  describe("given a valid publicId for an existing user", () => {
    it("should return the user profile with public circles and upcoming moments", async () => {
      const circles: PublicCircleMembership[] = [
        { circleSlug: "tech-paris", circleName: "Tech Paris", circleCover: null, role: "HOST" },
      ];
      const moments: PublicMomentRegistration[] = [
        {
          momentSlug: "soiree-js",
          momentTitle: "Soirée JS & Pizza",
          momentDate: new Date("2026-04-01"),
          circleName: "Tech Paris",
        },
      ];

      const deps = makeDeps({ circles, moments });
      const result = await getUserPublicProfile({ publicId: PUBLIC_ID }, deps);

      expect(result).not.toBeNull();
      expect(result!.user.publicId).toBe("jean-dupont-4821");
      expect(result!.publicCircles).toHaveLength(1);
      expect(result!.publicCircles[0].role).toBe("HOST");
      expect(result!.upcomingPublicMoments).toHaveLength(1);
      expect(result!.upcomingPublicMoments[0].momentTitle).toBe("Soirée JS & Pizza");
    });

    it("should return empty arrays when user has no public circles", async () => {
      const deps = makeDeps({ circles: [], moments: [] });
      const result = await getUserPublicProfile({ publicId: PUBLIC_ID }, deps);

      expect(result!.publicCircles).toHaveLength(0);
      expect(result!.upcomingPublicMoments).toHaveLength(0);
    });

    it("should return correct hostedMomentsCount from the PublicUser", async () => {
      const userWithHostedMoments = makePublicUser({ hostedMomentsCount: 15 });
      const deps = makeDeps({ publicUser: userWithHostedMoments });
      const result = await getUserPublicProfile({ publicId: PUBLIC_ID }, deps);

      expect(result!.user.hostedMomentsCount).toBe(15);
    });

    it("should return hostedMomentsCount of 0 when user has never hosted", async () => {
      const userNeverHosted = makePublicUser({ hostedMomentsCount: 0 });
      const deps = makeDeps({ publicUser: userNeverHosted });
      const result = await getUserPublicProfile({ publicId: PUBLIC_ID }, deps);

      expect(result!.user.hostedMomentsCount).toBe(0);
    });

    it("should never expose the user email in the returned profile", async () => {
      const deps = makeDeps();
      const result = await getUserPublicProfile({ publicId: PUBLIC_ID }, deps);

      expect(result).not.toBeNull();
      expect(result!.user).not.toHaveProperty("email");
    });
  });

  describe("given a publicId that does not exist", () => {
    it("should return null", async () => {
      const deps = makeDeps({ publicUser: null, internalUserId: null });
      const result = await getUserPublicProfile({ publicId: "unknown-id-9999" }, deps);

      expect(result).toBeNull();
    });
  });

  describe("given a valid publicId but resolvePublicProfile returns null", () => {
    it("should return null", async () => {
      const deps = makeDeps({ publicUser: null, internalUserId: null });
      const result = await getUserPublicProfile({ publicId: PUBLIC_ID }, deps);

      expect(result).toBeNull();
    });
  });

  describe("given user with private circles only", () => {
    it("should return empty circles array (filtering is done in the repository)", async () => {
      // Le filtrage public/privé est la responsabilité du repository (getPublicCirclesForUser).
      // Le usecase reçoit déjà la liste filtrée — on vérifie que le usecase retourne ce qu'il reçoit.
      const deps = makeDeps({ circles: [] });
      const result = await getUserPublicProfile({ publicId: PUBLIC_ID }, deps);

      expect(result!.publicCircles).toHaveLength(0);
    });
  });
});

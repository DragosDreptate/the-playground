import { describe, it, expect, vi } from "vitest";
import { getUserDashboardCircles } from "@/domain/usecases/get-user-dashboard-circles";
import {
  createMockCircleRepository,
  makeCircle,
} from "./helpers/mock-circle-repository";
import type { DashboardCircle } from "@/domain/models/circle";

function makeDashboardCircle(
  overrides: Partial<DashboardCircle> = {}
): DashboardCircle {
  return {
    ...makeCircle(),
    memberRole: "HOST",
    memberCount: 0,
    upcomingMomentCount: 0,
    nextMoment: null,
    ...overrides,
  };
}

describe("GetUserDashboardCircles", () => {
  describe("given the user is HOST of several circles with stats", () => {
    it("should return all circles with their stats", async () => {
      const dashboardCircles: DashboardCircle[] = [
        makeDashboardCircle({
          id: "circle-1",
          name: "Tech Circle",
          memberRole: "HOST",
          memberCount: 42,
          upcomingMomentCount: 3,
          nextMoment: { title: "Weekly standup", startsAt: new Date("2026-03-01") },
        }),
        makeDashboardCircle({
          id: "circle-2",
          name: "Design Circle",
          memberRole: "PLAYER",
          memberCount: 15,
          upcomingMomentCount: 1,
          nextMoment: { title: "Design review", startsAt: new Date("2026-03-05") },
        }),
      ];

      const circleRepository = createMockCircleRepository({
        findAllByUserIdWithStats: vi.fn().mockResolvedValue(dashboardCircles),
      });

      const result = await getUserDashboardCircles("user-1", { circleRepository });

      expect(result).toHaveLength(2);
      expect(circleRepository.findAllByUserIdWithStats).toHaveBeenCalledWith("user-1");
    });

    it("should return memberCount and upcomingMomentCount for each circle", async () => {
      const dashboardCircles: DashboardCircle[] = [
        makeDashboardCircle({
          id: "circle-1",
          memberCount: 12,
          upcomingMomentCount: 4,
          nextMoment: { title: "Prochain événement", startsAt: new Date("2026-03-10") },
        }),
      ];

      const circleRepository = createMockCircleRepository({
        findAllByUserIdWithStats: vi.fn().mockResolvedValue(dashboardCircles),
      });

      const result = await getUserDashboardCircles("user-1", { circleRepository });

      expect(result[0].memberCount).toBe(12);
      expect(result[0].upcomingMomentCount).toBe(4);
      expect(result[0].nextMoment).toEqual({
        title: "Prochain événement",
        startsAt: new Date("2026-03-10"),
      });
    });
  });

  describe("given the user is PLAYER in a circle (not HOST)", () => {
    it("should still return that circle with the PLAYER role", async () => {
      const dashboardCircles: DashboardCircle[] = [
        makeDashboardCircle({
          id: "circle-1",
          name: "Community as Player",
          memberRole: "PLAYER",
          memberCount: 8,
          upcomingMomentCount: 0,
          nextMoment: null,
        }),
      ];

      const circleRepository = createMockCircleRepository({
        findAllByUserIdWithStats: vi.fn().mockResolvedValue(dashboardCircles),
      });

      const result = await getUserDashboardCircles("user-1", { circleRepository });

      expect(result).toHaveLength(1);
      expect(result[0].memberRole).toBe("PLAYER");
    });
  });

  describe("given a circle with no upcoming moments", () => {
    it("should return nextMoment as null and upcomingMomentCount as 0", async () => {
      const dashboardCircles: DashboardCircle[] = [
        makeDashboardCircle({
          memberCount: 5,
          upcomingMomentCount: 0,
          nextMoment: null,
        }),
      ];

      const circleRepository = createMockCircleRepository({
        findAllByUserIdWithStats: vi.fn().mockResolvedValue(dashboardCircles),
      });

      const result = await getUserDashboardCircles("user-1", { circleRepository });

      expect(result[0].upcomingMomentCount).toBe(0);
      expect(result[0].nextMoment).toBeNull();
    });
  });

  describe("given the user belongs to no circles", () => {
    it("should return an empty array", async () => {
      const circleRepository = createMockCircleRepository({
        findAllByUserIdWithStats: vi.fn().mockResolvedValue([]),
      });

      const result = await getUserDashboardCircles("user-1", { circleRepository });

      expect(result).toEqual([]);
    });

    it("should still call findAllByUserIdWithStats with the correct userId", async () => {
      const circleRepository = createMockCircleRepository({
        findAllByUserIdWithStats: vi.fn().mockResolvedValue([]),
      });

      await getUserDashboardCircles("user-42", { circleRepository });

      expect(circleRepository.findAllByUserIdWithStats).toHaveBeenCalledWith("user-42");
    });
  });

  describe("given circles with mixed cover images", () => {
    it.each([
      {
        label: "circle with cover image",
        coverImage: "https://example.com/cover.jpg",
        coverImageAttribution: { name: "Photographer", url: "https://unsplash.com" },
      },
      {
        label: "circle without cover image",
        coverImage: null,
        coverImageAttribution: null,
      },
    ])("should handle $label correctly", async ({ coverImage, coverImageAttribution }) => {
      const dashboardCircles: DashboardCircle[] = [
        makeDashboardCircle({ coverImage, coverImageAttribution }),
      ];

      const circleRepository = createMockCircleRepository({
        findAllByUserIdWithStats: vi.fn().mockResolvedValue(dashboardCircles),
      });

      const result = await getUserDashboardCircles("user-1", { circleRepository });

      expect(result[0].coverImage).toBe(coverImage);
      expect(result[0].coverImageAttribution).toEqual(coverImageAttribution);
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
  //      (findAllByUserIdWithStats filtre WHERE userId = ?)
  //
  // Ces tests vérifient que le usecase propage le userId tel
  // quel au repository, sans substitution ni contamination
  // croisée entre utilisateurs.
  // ─────────────────────────────────────────────────────────────

  describe("Security — multi-tenant isolation (IDOR)", () => {
    it("should call findAllByUserIdWithStats with the exact userId provided — no substitution", async () => {
      const circleRepository = createMockCircleRepository({
        findAllByUserIdWithStats: vi.fn().mockResolvedValue([]),
      });

      await getUserDashboardCircles("user-alice", { circleRepository });

      expect(circleRepository.findAllByUserIdWithStats).toHaveBeenCalledWith("user-alice");
      expect(circleRepository.findAllByUserIdWithStats).toHaveBeenCalledTimes(1);
    });

    it("should NOT call findAllByUserIdWithStats with any userId other than the one provided", async () => {
      // user-attacker tente d'obtenir les circles de user-victim
      // en passant directement user-victim comme userId.
      // Le usecase ne filtre pas — il passe le userId à la couche infra.
      // La défense est que le caller (page) injecte session.user.id,
      // jamais une valeur controllée par l'attaquant.
      // Ce test vérifie que le usecase ne substitue PAS le userId.
      const circleRepository = createMockCircleRepository({
        findAllByUserIdWithStats: vi.fn().mockResolvedValue([]),
      });

      await getUserDashboardCircles("user-attacker", { circleRepository });

      expect(circleRepository.findAllByUserIdWithStats).not.toHaveBeenCalledWith("user-victim");
      expect(circleRepository.findAllByUserIdWithStats).toHaveBeenCalledWith("user-attacker");
    });

    it("should return only the data scoped to the provided userId — no data leakage to other users", async () => {
      // user-alice a 2 circles, user-bob en a 0.
      // Appeler le usecase avec user-alice ne doit pas retourner
      // les données de user-bob, et vice-versa.
      const aliceCircles: DashboardCircle[] = [
        makeDashboardCircle({ id: "alice-circle-1", name: "Alice Circle" }),
        makeDashboardCircle({ id: "alice-circle-2", name: "Alice Circle 2" }),
      ];

      const circleRepository = createMockCircleRepository({
        findAllByUserIdWithStats: vi.fn().mockImplementation((uid: string) => {
          if (uid === "user-alice") return Promise.resolve(aliceCircles);
          return Promise.resolve([]); // user-bob voit 0 circles
        }),
      });

      const aliceResult = await getUserDashboardCircles("user-alice", { circleRepository });
      const bobResult = await getUserDashboardCircles("user-bob", { circleRepository });

      expect(aliceResult).toHaveLength(2);
      expect(aliceResult[0].name).toBe("Alice Circle");
      expect(bobResult).toHaveLength(0);
    });

    it("should propagate distinct userIds correctly for concurrent calls — no cross-contamination", async () => {
      const calls: string[] = [];
      const circleRepository = createMockCircleRepository({
        findAllByUserIdWithStats: vi.fn().mockImplementation((uid: string) => {
          calls.push(uid);
          return Promise.resolve([]);
        }),
      });

      await Promise.all([
        getUserDashboardCircles("user-alice", { circleRepository }),
        getUserDashboardCircles("user-bob", { circleRepository }),
        getUserDashboardCircles("user-carol", { circleRepository }),
      ]);

      // Chaque userId est transmis exactement une fois, sans mélange
      expect(calls.filter((id) => id === "user-alice")).toHaveLength(1);
      expect(calls.filter((id) => id === "user-bob")).toHaveLength(1);
      expect(calls.filter((id) => id === "user-carol")).toHaveLength(1);
      expect(calls).toHaveLength(3);
    });
  });
});

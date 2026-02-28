import { describe, it, expect, vi } from "vitest";
import { setDashboardMode } from "@/domain/usecases/set-dashboard-mode";
import { createMockUserRepository } from "./helpers/mock-user-repository";
import type { DashboardMode } from "@/domain/models/user";

describe("SetDashboardMode", () => {
  // ─────────────────────────────────────────────────────────────
  // Happy paths — les deux modes valides
  // ─────────────────────────────────────────────────────────────

  describe("given a valid PARTICIPANT mode", () => {
    it("should call updateDashboardMode with the correct userId and mode", async () => {
      const userRepository = createMockUserRepository();

      await setDashboardMode("user-1", "PARTICIPANT", { userRepository });

      expect(userRepository.updateDashboardMode).toHaveBeenCalledWith(
        "user-1",
        "PARTICIPANT"
      );
      expect(userRepository.updateDashboardMode).toHaveBeenCalledTimes(1);
    });

    it("should resolve without returning a value", async () => {
      const userRepository = createMockUserRepository();

      const result = await setDashboardMode("user-1", "PARTICIPANT", {
        userRepository,
      });

      expect(result).toBeUndefined();
    });
  });

  describe("given a valid ORGANIZER mode", () => {
    it("should call updateDashboardMode with the correct userId and mode", async () => {
      const userRepository = createMockUserRepository();

      await setDashboardMode("user-2", "ORGANIZER", { userRepository });

      expect(userRepository.updateDashboardMode).toHaveBeenCalledWith(
        "user-2",
        "ORGANIZER"
      );
      expect(userRepository.updateDashboardMode).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Contrat de délégation — le usecase ne transforme pas les args
  // ─────────────────────────────────────────────────────────────

  describe("given the usecase passes arguments to the repository as-is", () => {
    it.each([
      { userId: "user-alice", mode: "PARTICIPANT" as DashboardMode },
      { userId: "user-bob", mode: "ORGANIZER" as DashboardMode },
      { userId: "user-carol", mode: "PARTICIPANT" as DashboardMode },
    ])(
      "should delegate ($userId, $mode) to updateDashboardMode without transformation",
      async ({ userId, mode }) => {
        let capturedUserId: string | undefined;
        let capturedMode: DashboardMode | undefined;

        const userRepository = createMockUserRepository({
          updateDashboardMode: vi
            .fn()
            .mockImplementation((uid: string, m: DashboardMode) => {
              capturedUserId = uid;
              capturedMode = m;
              return Promise.resolve(undefined);
            }),
        });

        await setDashboardMode(userId, mode, { userRepository });

        expect(capturedUserId).toBe(userId);
        expect(capturedMode).toBe(mode);
      }
    );
  });

  // ─────────────────────────────────────────────────────────────
  // Sécurité — Isolation multi-tenant (IDOR)
  //
  // Le usecase reçoit le userId depuis la session (couche app),
  // jamais depuis un paramètre contrôlé par l'utilisateur.
  // Ces tests vérifient que le userId est propagé sans substitution :
  // un appel pour user-alice ne peut pas affecter user-bob.
  // ─────────────────────────────────────────────────────────────

  describe("Security — multi-tenant isolation (IDOR)", () => {
    it("should call updateDashboardMode with the exact userId provided — no substitution", async () => {
      const userRepository = createMockUserRepository();

      await setDashboardMode("user-alice", "PARTICIPANT", { userRepository });

      expect(userRepository.updateDashboardMode).toHaveBeenCalledWith(
        "user-alice",
        "PARTICIPANT"
      );
      expect(userRepository.updateDashboardMode).not.toHaveBeenCalledWith(
        "user-victim",
        expect.anything()
      );
    });

    it("should NOT call updateDashboardMode with any other userId than the one provided", async () => {
      const userRepository = createMockUserRepository();

      await setDashboardMode("user-attacker", "ORGANIZER", { userRepository });

      expect(userRepository.updateDashboardMode).not.toHaveBeenCalledWith(
        "user-victim",
        expect.anything()
      );
      expect(userRepository.updateDashboardMode).toHaveBeenCalledWith(
        "user-attacker",
        "ORGANIZER"
      );
    });

    it("should propagate distinct userIds correctly for concurrent calls — no cross-contamination", async () => {
      const calls: Array<{ userId: string; mode: DashboardMode }> = [];

      const userRepository = createMockUserRepository({
        updateDashboardMode: vi
          .fn()
          .mockImplementation((uid: string, mode: DashboardMode) => {
            calls.push({ userId: uid, mode });
            return Promise.resolve(undefined);
          }),
      });

      await Promise.all([
        setDashboardMode("user-alice", "PARTICIPANT", { userRepository }),
        setDashboardMode("user-bob", "ORGANIZER", { userRepository }),
        setDashboardMode("user-carol", "PARTICIPANT", { userRepository }),
      ]);

      // Chaque userId est transmis exactement une fois avec son mode
      const aliceCalls = calls.filter((c) => c.userId === "user-alice");
      const bobCalls = calls.filter((c) => c.userId === "user-bob");
      const carolCalls = calls.filter((c) => c.userId === "user-carol");

      expect(aliceCalls).toHaveLength(1);
      expect(aliceCalls[0].mode).toBe("PARTICIPANT");

      expect(bobCalls).toHaveLength(1);
      expect(bobCalls[0].mode).toBe("ORGANIZER");

      expect(carolCalls).toHaveLength(1);
      expect(carolCalls[0].mode).toBe("PARTICIPANT");

      expect(calls).toHaveLength(3);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Comportement en cas d'erreur du repository
  //
  // Le usecase ne contient pas de try/catch — toute erreur
  // infrastructure doit remonter à l'appelant (server action).
  // ─────────────────────────────────────────────────────────────

  describe("given the repository throws an error", () => {
    it("should propagate the error to the caller", async () => {
      const dbError = new Error("Database connection lost");
      const userRepository = createMockUserRepository({
        updateDashboardMode: vi.fn().mockRejectedValue(dbError),
      });

      await expect(
        setDashboardMode("user-1", "PARTICIPANT", { userRepository })
      ).rejects.toThrow("Database connection lost");
    });
  });
});

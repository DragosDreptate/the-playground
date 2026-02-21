/**
 * Tests de sécurité — Contrôle d'accès Admin
 *
 * Vérifie que tous les usecases admin rejettent les utilisateurs
 * dont le rôle n'est pas "ADMIN" (defense-in-depth au niveau usecase,
 * en complément du guard `requireAdmin()` de la couche action).
 *
 * Convention BDD : describe("[usecase] — Admin RBAC") / it("should throw / should allow")
 */

import { describe, it, expect, vi } from "vitest";

// Usecases admin
import { getAdminStats } from "@/domain/usecases/admin/get-admin-stats";
import { getAdminUsers } from "@/domain/usecases/admin/get-admin-users";
import { getAdminUser } from "@/domain/usecases/admin/get-admin-user";
import { adminDeleteUser } from "@/domain/usecases/admin/admin-delete-user";
import { getAdminCircles } from "@/domain/usecases/admin/get-admin-circles";
import { getAdminCircle } from "@/domain/usecases/admin/get-admin-circle";
import { adminDeleteCircle } from "@/domain/usecases/admin/admin-delete-circle";
import { getAdminMoments } from "@/domain/usecases/admin/get-admin-moments";
import { getAdminMoment } from "@/domain/usecases/admin/get-admin-moment";
import { adminDeleteMoment } from "@/domain/usecases/admin/admin-delete-moment";
import { adminUpdateMomentStatus } from "@/domain/usecases/admin/admin-update-moment-status";

// Erreur domaine
import { AdminUnauthorizedError } from "@/domain/errors";

// Mock helpers admin
import {
  createMockAdminRepository,
  makeAdminStats,
  makeAdminUserDetail,
  makeAdminCircleDetail,
  makeAdminMomentDetail,
} from "../admin/mock-admin-repository";

// ─────────────────────────────────────────────────────────────
// Rôles non-autorisés
// ─────────────────────────────────────────────────────────────

const NON_ADMIN_ROLES = ["USER"] as const;

// ─────────────────────────────────────────────────────────────
// getAdminStats — Admin RBAC
// ─────────────────────────────────────────────────────────────

describe("Security — Admin Access Control", () => {
  describe("getAdminStats — contrôle de rôle", () => {
    it.each(NON_ADMIN_ROLES)(
      "should throw AdminUnauthorizedError when callerRole is %s",
      async (role) => {
        const adminRepository = createMockAdminRepository();

        await expect(
          getAdminStats(role, { adminRepository })
        ).rejects.toThrow(AdminUnauthorizedError);

        expect(adminRepository.getStats).not.toHaveBeenCalled();
      }
    );

    it("should allow an ADMIN to get platform stats", async () => {
      const stats = makeAdminStats({ totalUsers: 42 });
      const adminRepository = createMockAdminRepository({
        getStats: vi.fn().mockResolvedValue(stats),
      });

      const result = await getAdminStats("ADMIN", { adminRepository });
      expect(result.totalUsers).toBe(42);
      expect(adminRepository.getStats).toHaveBeenCalledOnce();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getAdminUsers — Admin RBAC
  // ─────────────────────────────────────────────────────────────

  describe("getAdminUsers — contrôle de rôle", () => {
    it.each(NON_ADMIN_ROLES)(
      "should throw AdminUnauthorizedError when callerRole is %s",
      async (role) => {
        const adminRepository = createMockAdminRepository();

        await expect(
          getAdminUsers(role, {}, { adminRepository })
        ).rejects.toThrow(AdminUnauthorizedError);

        expect(adminRepository.findAllUsers).not.toHaveBeenCalled();
        expect(adminRepository.countUsers).not.toHaveBeenCalled();
      }
    );

    it("should allow an ADMIN to list users", async () => {
      const adminRepository = createMockAdminRepository({
        findAllUsers: vi.fn().mockResolvedValue([]),
        countUsers: vi.fn().mockResolvedValue(0),
      });

      const result = await getAdminUsers("ADMIN", {}, { adminRepository });
      expect(result.total).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getAdminUser — Admin RBAC
  // ─────────────────────────────────────────────────────────────

  describe("getAdminUser — contrôle de rôle", () => {
    it.each(NON_ADMIN_ROLES)(
      "should throw AdminUnauthorizedError when callerRole is %s",
      async (role) => {
        const adminRepository = createMockAdminRepository();

        await expect(
          getAdminUser(role, "user-1", { adminRepository })
        ).rejects.toThrow(AdminUnauthorizedError);

        expect(adminRepository.findUserById).not.toHaveBeenCalled();
      }
    );

    it("should allow an ADMIN to get a user detail", async () => {
      const userDetail = makeAdminUserDetail({ id: "user-1" });
      const adminRepository = createMockAdminRepository({
        findUserById: vi.fn().mockResolvedValue(userDetail),
      });

      const result = await getAdminUser("ADMIN", "user-1", { adminRepository });
      expect(result?.id).toBe("user-1");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // adminDeleteUser — Admin RBAC
  // ─────────────────────────────────────────────────────────────

  describe("adminDeleteUser — contrôle de rôle", () => {
    it.each(NON_ADMIN_ROLES)(
      "should throw AdminUnauthorizedError when callerRole is %s",
      async (role) => {
        const adminRepository = createMockAdminRepository({
          deleteUser: vi.fn().mockResolvedValue(undefined),
        });

        await expect(
          adminDeleteUser(role, "user-1", { adminRepository })
        ).rejects.toThrow(AdminUnauthorizedError);

        // La suppression ne doit jamais être déclenchée
        expect(adminRepository.deleteUser).not.toHaveBeenCalled();
      }
    );

    it("should allow an ADMIN to delete a user", async () => {
      const adminRepository = createMockAdminRepository({
        deleteUser: vi.fn().mockResolvedValue(undefined),
      });

      await expect(
        adminDeleteUser("ADMIN", "user-1", { adminRepository })
      ).resolves.toBeUndefined();
      expect(adminRepository.deleteUser).toHaveBeenCalledWith("user-1");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getAdminCircles — Admin RBAC
  // ─────────────────────────────────────────────────────────────

  describe("getAdminCircles — contrôle de rôle", () => {
    it.each(NON_ADMIN_ROLES)(
      "should throw AdminUnauthorizedError when callerRole is %s",
      async (role) => {
        const adminRepository = createMockAdminRepository();

        await expect(
          getAdminCircles(role, {}, { adminRepository })
        ).rejects.toThrow(AdminUnauthorizedError);

        expect(adminRepository.findAllCircles).not.toHaveBeenCalled();
        expect(adminRepository.countCircles).not.toHaveBeenCalled();
      }
    );

    it("should allow an ADMIN to list circles", async () => {
      const adminRepository = createMockAdminRepository({
        findAllCircles: vi.fn().mockResolvedValue([]),
        countCircles: vi.fn().mockResolvedValue(0),
      });

      const result = await getAdminCircles("ADMIN", {}, { adminRepository });
      expect(result.circles).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getAdminCircle — Admin RBAC
  // ─────────────────────────────────────────────────────────────

  describe("getAdminCircle — contrôle de rôle", () => {
    it.each(NON_ADMIN_ROLES)(
      "should throw AdminUnauthorizedError when callerRole is %s",
      async (role) => {
        const adminRepository = createMockAdminRepository();

        await expect(
          getAdminCircle(role, "circle-1", { adminRepository })
        ).rejects.toThrow(AdminUnauthorizedError);

        expect(adminRepository.findCircleById).not.toHaveBeenCalled();
      }
    );

    it("should allow an ADMIN to get a circle detail", async () => {
      const circleDetail = makeAdminCircleDetail({ id: "circle-1" });
      const adminRepository = createMockAdminRepository({
        findCircleById: vi.fn().mockResolvedValue(circleDetail),
      });

      const result = await getAdminCircle("ADMIN", "circle-1", { adminRepository });
      expect(result?.id).toBe("circle-1");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // adminDeleteCircle — Admin RBAC
  // ─────────────────────────────────────────────────────────────

  describe("adminDeleteCircle — contrôle de rôle", () => {
    it.each(NON_ADMIN_ROLES)(
      "should throw AdminUnauthorizedError when callerRole is %s",
      async (role) => {
        const adminRepository = createMockAdminRepository({
          deleteCircle: vi.fn().mockResolvedValue(undefined),
        });

        await expect(
          adminDeleteCircle(role, "circle-1", { adminRepository })
        ).rejects.toThrow(AdminUnauthorizedError);

        expect(adminRepository.deleteCircle).not.toHaveBeenCalled();
      }
    );

    it("should allow an ADMIN to delete a circle", async () => {
      const adminRepository = createMockAdminRepository({
        deleteCircle: vi.fn().mockResolvedValue(undefined),
      });

      await expect(
        adminDeleteCircle("ADMIN", "circle-1", { adminRepository })
      ).resolves.toBeUndefined();
      expect(adminRepository.deleteCircle).toHaveBeenCalledWith("circle-1");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getAdminMoments — Admin RBAC
  // ─────────────────────────────────────────────────────────────

  describe("getAdminMoments — contrôle de rôle", () => {
    it.each(NON_ADMIN_ROLES)(
      "should throw AdminUnauthorizedError when callerRole is %s",
      async (role) => {
        const adminRepository = createMockAdminRepository();

        await expect(
          getAdminMoments(role, {}, { adminRepository })
        ).rejects.toThrow(AdminUnauthorizedError);

        expect(adminRepository.findAllMoments).not.toHaveBeenCalled();
        expect(adminRepository.countMoments).not.toHaveBeenCalled();
      }
    );

    it("should allow an ADMIN to list moments", async () => {
      const adminRepository = createMockAdminRepository({
        findAllMoments: vi.fn().mockResolvedValue([]),
        countMoments: vi.fn().mockResolvedValue(0),
      });

      const result = await getAdminMoments("ADMIN", {}, { adminRepository });
      expect(result.moments).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getAdminMoment — Admin RBAC
  // ─────────────────────────────────────────────────────────────

  describe("getAdminMoment — contrôle de rôle", () => {
    it.each(NON_ADMIN_ROLES)(
      "should throw AdminUnauthorizedError when callerRole is %s",
      async (role) => {
        const adminRepository = createMockAdminRepository();

        await expect(
          getAdminMoment(role, "moment-1", { adminRepository })
        ).rejects.toThrow(AdminUnauthorizedError);

        expect(adminRepository.findMomentById).not.toHaveBeenCalled();
      }
    );

    it("should allow an ADMIN to get a moment detail", async () => {
      const momentDetail = makeAdminMomentDetail({ id: "moment-1" });
      const adminRepository = createMockAdminRepository({
        findMomentById: vi.fn().mockResolvedValue(momentDetail),
      });

      const result = await getAdminMoment("ADMIN", "moment-1", { adminRepository });
      expect(result?.id).toBe("moment-1");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // adminDeleteMoment — Admin RBAC
  // ─────────────────────────────────────────────────────────────

  describe("adminDeleteMoment — contrôle de rôle", () => {
    it.each(NON_ADMIN_ROLES)(
      "should throw AdminUnauthorizedError when callerRole is %s",
      async (role) => {
        const adminRepository = createMockAdminRepository({
          deleteMoment: vi.fn().mockResolvedValue(undefined),
        });

        await expect(
          adminDeleteMoment(role, "moment-1", { adminRepository })
        ).rejects.toThrow(AdminUnauthorizedError);

        expect(adminRepository.deleteMoment).not.toHaveBeenCalled();
      }
    );

    it("should allow an ADMIN to delete a moment", async () => {
      const adminRepository = createMockAdminRepository({
        deleteMoment: vi.fn().mockResolvedValue(undefined),
      });

      await expect(
        adminDeleteMoment("ADMIN", "moment-1", { adminRepository })
      ).resolves.toBeUndefined();
      expect(adminRepository.deleteMoment).toHaveBeenCalledWith("moment-1");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // adminUpdateMomentStatus — Admin RBAC
  // ─────────────────────────────────────────────────────────────

  describe("adminUpdateMomentStatus — contrôle de rôle", () => {
    it.each(NON_ADMIN_ROLES)(
      "should throw AdminUnauthorizedError when callerRole is %s",
      async (role) => {
        const adminRepository = createMockAdminRepository({
          updateMomentStatus: vi.fn().mockResolvedValue(undefined),
        });

        await expect(
          adminUpdateMomentStatus(role, "moment-1", "CANCELLED", { adminRepository })
        ).rejects.toThrow(AdminUnauthorizedError);

        expect(adminRepository.updateMomentStatus).not.toHaveBeenCalled();
      }
    );

    it("should allow an ADMIN to update a moment status", async () => {
      const adminRepository = createMockAdminRepository({
        updateMomentStatus: vi.fn().mockResolvedValue(undefined),
      });

      await expect(
        adminUpdateMomentStatus("ADMIN", "moment-1", "CANCELLED", { adminRepository })
      ).resolves.toBeUndefined();
      expect(adminRepository.updateMomentStatus).toHaveBeenCalledWith("moment-1", "CANCELLED");
    });
  });
});

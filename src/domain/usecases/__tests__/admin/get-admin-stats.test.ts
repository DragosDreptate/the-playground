import { describe, it, expect, vi } from "vitest";
import { getAdminStats } from "@/domain/usecases/admin/get-admin-stats";
import {
  createMockAdminRepository,
  makeAdminStats,
} from "./mock-admin-repository";

describe("GetAdminStats", () => {
  describe("given a populated platform", () => {
    it("should return platform statistics from the repository", async () => {
      const stats = makeAdminStats({
        totalUsers: 100,
        totalCircles: 20,
        totalMoments: 50,
        totalRegistrations: 300,
        recentUsers: 10,
        recentCircles: 3,
        recentMoments: 8,
      });
      const adminRepository = createMockAdminRepository({
        getStats: vi.fn().mockResolvedValue(stats),
      });

      const result = await getAdminStats("ADMIN", { adminRepository });

      expect(result.totalUsers).toBe(100);
      expect(result.totalCircles).toBe(20);
      expect(result.totalMoments).toBe(50);
      expect(result.totalRegistrations).toBe(300);
      expect(result.recentUsers).toBe(10);
      expect(result.recentCircles).toBe(3);
      expect(result.recentMoments).toBe(8);
    });
  });

  describe("given an empty platform", () => {
    it("should return all-zero statistics", async () => {
      const stats = makeAdminStats({
        totalUsers: 0,
        totalCircles: 0,
        totalMoments: 0,
        totalRegistrations: 0,
        recentUsers: 0,
        recentCircles: 0,
        recentMoments: 0,
      });
      const adminRepository = createMockAdminRepository({
        getStats: vi.fn().mockResolvedValue(stats),
      });

      const result = await getAdminStats("ADMIN", { adminRepository });

      expect(result.totalUsers).toBe(0);
      expect(result.totalCircles).toBe(0);
      expect(result.totalMoments).toBe(0);
    });
  });

  describe("given the repository is called", () => {
    it("should delegate to adminRepository.getStats", async () => {
      const adminRepository = createMockAdminRepository();

      await getAdminStats("ADMIN", { adminRepository });

      expect(adminRepository.getStats).toHaveBeenCalledOnce();
    });
  });
});

import { describe, it, expect, vi } from "vitest";
import { getAdminUsers } from "@/domain/usecases/admin/get-admin-users";
import {
  createMockAdminRepository,
  makeAdminUserRow,
} from "./mock-admin-repository";

describe("GetAdminUsers", () => {
  describe("given no filters", () => {
    it("should return users and total count", async () => {
      const users = [makeAdminUserRow({ id: "user-1" }), makeAdminUserRow({ id: "user-2" })];
      const adminRepository = createMockAdminRepository({
        findAllUsers: vi.fn().mockResolvedValue(users),
        countUsers: vi.fn().mockResolvedValue(2),
      });

      const result = await getAdminUsers("ADMIN", {}, { adminRepository });

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe("given a search filter", () => {
    it("should pass the search filter to both findAllUsers and countUsers", async () => {
      const adminRepository = createMockAdminRepository({
        findAllUsers: vi.fn().mockResolvedValue([]),
        countUsers: vi.fn().mockResolvedValue(0),
      });

      await getAdminUsers("ADMIN", { search: "alice" }, { adminRepository });

      expect(adminRepository.findAllUsers).toHaveBeenCalledWith({ search: "alice" });
      expect(adminRepository.countUsers).toHaveBeenCalledWith({ search: "alice" });
    });
  });

  describe("given a role filter", () => {
    it("should pass the role filter to both findAllUsers and countUsers", async () => {
      const adminUsers = [makeAdminUserRow({ role: "ADMIN" })];
      const adminRepository = createMockAdminRepository({
        findAllUsers: vi.fn().mockResolvedValue(adminUsers),
        countUsers: vi.fn().mockResolvedValue(1),
      });

      const result = await getAdminUsers("ADMIN", { role: "ADMIN" }, { adminRepository });

      expect(result.users[0].role).toBe("ADMIN");
      expect(adminRepository.findAllUsers).toHaveBeenCalledWith({ role: "ADMIN" });
    });
  });

  describe("given pagination filters", () => {
    it("should pass limit and offset to both repository methods", async () => {
      const adminRepository = createMockAdminRepository({
        findAllUsers: vi.fn().mockResolvedValue([]),
        countUsers: vi.fn().mockResolvedValue(100),
      });

      await getAdminUsers("ADMIN", { limit: 10, offset: 20 }, { adminRepository });

      expect(adminRepository.findAllUsers).toHaveBeenCalledWith({ limit: 10, offset: 20 });
      expect(adminRepository.countUsers).toHaveBeenCalledWith({ limit: 10, offset: 20 });
    });
  });

  describe("given the repository calls", () => {
    it("should call findAllUsers and countUsers in parallel", async () => {
      const callOrder: string[] = [];
      const adminRepository = createMockAdminRepository({
        findAllUsers: vi.fn().mockImplementation(async () => {
          callOrder.push("findAllUsers");
          return [];
        }),
        countUsers: vi.fn().mockImplementation(async () => {
          callOrder.push("countUsers");
          return 0;
        }),
      });

      await getAdminUsers("ADMIN", {}, { adminRepository });

      expect(callOrder).toContain("findAllUsers");
      expect(callOrder).toContain("countUsers");
      expect(adminRepository.findAllUsers).toHaveBeenCalledOnce();
      expect(adminRepository.countUsers).toHaveBeenCalledOnce();
    });
  });

  describe("given no matching users", () => {
    it("should return an empty list with total 0", async () => {
      const adminRepository = createMockAdminRepository({
        findAllUsers: vi.fn().mockResolvedValue([]),
        countUsers: vi.fn().mockResolvedValue(0),
      });

      const result = await getAdminUsers("ADMIN", { search: "nobody" }, { adminRepository });

      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});

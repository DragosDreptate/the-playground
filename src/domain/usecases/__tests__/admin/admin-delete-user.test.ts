import { describe, it, expect, vi } from "vitest";
import { adminDeleteUser } from "@/domain/usecases/admin/admin-delete-user";
import { createMockAdminRepository } from "./mock-admin-repository";

describe("AdminDeleteUser", () => {
  describe("given an existing user", () => {
    it("should call adminRepository.deleteUser with the userId", async () => {
      const adminRepository = createMockAdminRepository({
        deleteUser: vi.fn().mockResolvedValue(undefined),
      });

      await adminDeleteUser("ADMIN", "user-1", { adminRepository });

      expect(adminRepository.deleteUser).toHaveBeenCalledWith("user-1");
      expect(adminRepository.deleteUser).toHaveBeenCalledOnce();
    });

    it("should resolve without error", async () => {
      const adminRepository = createMockAdminRepository({
        deleteUser: vi.fn().mockResolvedValue(undefined),
      });

      await expect(adminDeleteUser("ADMIN", "user-1", { adminRepository })).resolves.toBeUndefined();
    });
  });

  describe("given different user IDs", () => {
    it.each([
      ["user-abc"],
      ["user-123"],
      ["user-xyz"],
    ])("should pass userId %s to the repository", async (userId) => {
      const adminRepository = createMockAdminRepository({
        deleteUser: vi.fn().mockResolvedValue(undefined),
      });

      await adminDeleteUser("ADMIN", userId, { adminRepository });

      expect(adminRepository.deleteUser).toHaveBeenCalledWith(userId);
    });
  });
});

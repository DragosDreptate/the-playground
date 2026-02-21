import { describe, it, expect, vi } from "vitest";
import { getAdminUser } from "@/domain/usecases/admin/get-admin-user";
import {
  createMockAdminRepository,
  makeAdminUserDetail,
} from "./mock-admin-repository";

describe("GetAdminUser", () => {
  describe("given an existing user", () => {
    it("should return the user detail", async () => {
      const userDetail = makeAdminUserDetail({
        id: "user-1",
        email: "alice@example.com",
        firstName: "Alice",
        lastName: "Martin",
        role: "USER",
        registrationCount: 10,
      });
      const adminRepository = createMockAdminRepository({
        findUserById: vi.fn().mockResolvedValue(userDetail),
      });

      const result = await getAdminUser("user-1", { adminRepository });

      expect(result).toEqual(userDetail);
      expect(adminRepository.findUserById).toHaveBeenCalledWith("user-1");
    });
  });

  describe("given an ADMIN user", () => {
    it("should return the user detail with role ADMIN", async () => {
      const adminUserDetail = makeAdminUserDetail({
        id: "admin-1",
        role: "ADMIN",
        onboardingCompleted: true,
      });
      const adminRepository = createMockAdminRepository({
        findUserById: vi.fn().mockResolvedValue(adminUserDetail),
      });

      const result = await getAdminUser("admin-1", { adminRepository });

      expect(result?.role).toBe("ADMIN");
    });
  });

  describe("given a non-existent user", () => {
    it("should return null", async () => {
      const adminRepository = createMockAdminRepository({
        findUserById: vi.fn().mockResolvedValue(null),
      });

      const result = await getAdminUser("user-999", { adminRepository });

      expect(result).toBeNull();
    });
  });

  describe("given a user with multiple circles", () => {
    it("should return all circle memberships in the detail", async () => {
      const userDetail = makeAdminUserDetail({
        circles: [
          { id: "circle-1", name: "Tech Paris", slug: "tech-paris", role: "HOST" },
          { id: "circle-2", name: "Design Lyon", slug: "design-lyon", role: "PLAYER" },
        ],
      });
      const adminRepository = createMockAdminRepository({
        findUserById: vi.fn().mockResolvedValue(userDetail),
      });

      const result = await getAdminUser("user-1", { adminRepository });

      expect(result?.circles).toHaveLength(2);
      expect(result?.circles[0].role).toBe("HOST");
      expect(result?.circles[1].role).toBe("PLAYER");
    });
  });
});

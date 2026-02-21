import { describe, it, expect, vi } from "vitest";
import { adminDeleteCircle } from "@/domain/usecases/admin/admin-delete-circle";
import { createMockAdminRepository } from "./mock-admin-repository";

describe("AdminDeleteCircle", () => {
  describe("given an existing circle", () => {
    it("should call adminRepository.deleteCircle with the circleId", async () => {
      const adminRepository = createMockAdminRepository({
        deleteCircle: vi.fn().mockResolvedValue(undefined),
      });

      await adminDeleteCircle("ADMIN", "circle-1", { adminRepository });

      expect(adminRepository.deleteCircle).toHaveBeenCalledWith("circle-1");
      expect(adminRepository.deleteCircle).toHaveBeenCalledOnce();
    });

    it("should resolve without error", async () => {
      const adminRepository = createMockAdminRepository({
        deleteCircle: vi.fn().mockResolvedValue(undefined),
      });

      await expect(adminDeleteCircle("ADMIN", "circle-1", { adminRepository })).resolves.toBeUndefined();
    });
  });

  describe("given different circle IDs", () => {
    it.each([
      ["circle-abc"],
      ["circle-123"],
      ["circle-xyz"],
    ])("should pass circleId %s to the repository", async (circleId) => {
      const adminRepository = createMockAdminRepository({
        deleteCircle: vi.fn().mockResolvedValue(undefined),
      });

      await adminDeleteCircle("ADMIN", circleId, { adminRepository });

      expect(adminRepository.deleteCircle).toHaveBeenCalledWith(circleId);
    });
  });
});

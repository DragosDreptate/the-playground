import { describe, it, expect, vi } from "vitest";
import { adminUpdateMomentStatus } from "@/domain/usecases/admin/admin-update-moment-status";
import { createMockAdminRepository } from "./mock-admin-repository";
import type { MomentStatus } from "@/domain/models/moment";

describe("AdminUpdateMomentStatus", () => {
  describe("given a valid moment and a target status", () => {
    it("should call adminRepository.updateMomentStatus with momentId and status", async () => {
      const adminRepository = createMockAdminRepository({
        updateMomentStatus: vi.fn().mockResolvedValue(undefined),
      });

      await adminUpdateMomentStatus("moment-1", "CANCELLED", { adminRepository });

      expect(adminRepository.updateMomentStatus).toHaveBeenCalledWith(
        "moment-1",
        "CANCELLED"
      );
      expect(adminRepository.updateMomentStatus).toHaveBeenCalledOnce();
    });

    it("should resolve without error", async () => {
      const adminRepository = createMockAdminRepository({
        updateMomentStatus: vi.fn().mockResolvedValue(undefined),
      });

      await expect(
        adminUpdateMomentStatus("moment-1", "PUBLISHED", { adminRepository })
      ).resolves.toBeUndefined();
    });
  });

  describe("given all possible target statuses", () => {
    it.each<MomentStatus>([
      "DRAFT",
      "PUBLISHED",
      "CANCELLED",
      "PAST",
    ])("should pass status %s to the repository", async (status) => {
      const adminRepository = createMockAdminRepository({
        updateMomentStatus: vi.fn().mockResolvedValue(undefined),
      });

      await adminUpdateMomentStatus("moment-1", status, { adminRepository });

      expect(adminRepository.updateMomentStatus).toHaveBeenCalledWith("moment-1", status);
    });
  });

  describe("given different moment IDs", () => {
    it("should always pass the correct momentId to the repository", async () => {
      const adminRepository = createMockAdminRepository({
        updateMomentStatus: vi.fn().mockResolvedValue(undefined),
      });

      await adminUpdateMomentStatus("moment-99", "DRAFT", { adminRepository });

      expect(adminRepository.updateMomentStatus).toHaveBeenCalledWith("moment-99", "DRAFT");
    });
  });
});

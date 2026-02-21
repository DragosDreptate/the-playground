import { describe, it, expect, vi } from "vitest";
import { adminDeleteMoment } from "@/domain/usecases/admin/admin-delete-moment";
import { createMockAdminRepository } from "./mock-admin-repository";

describe("AdminDeleteMoment", () => {
  describe("given an existing moment", () => {
    it("should call adminRepository.deleteMoment with the momentId", async () => {
      const adminRepository = createMockAdminRepository({
        deleteMoment: vi.fn().mockResolvedValue(undefined),
      });

      await adminDeleteMoment("moment-1", { adminRepository });

      expect(adminRepository.deleteMoment).toHaveBeenCalledWith("moment-1");
      expect(adminRepository.deleteMoment).toHaveBeenCalledOnce();
    });

    it("should resolve without error", async () => {
      const adminRepository = createMockAdminRepository({
        deleteMoment: vi.fn().mockResolvedValue(undefined),
      });

      await expect(adminDeleteMoment("moment-1", { adminRepository })).resolves.toBeUndefined();
    });
  });

  describe("given different moment IDs", () => {
    it.each([
      ["moment-abc"],
      ["moment-123"],
      ["moment-xyz"],
    ])("should pass momentId %s to the repository", async (momentId) => {
      const adminRepository = createMockAdminRepository({
        deleteMoment: vi.fn().mockResolvedValue(undefined),
      });

      await adminDeleteMoment(momentId, { adminRepository });

      expect(adminRepository.deleteMoment).toHaveBeenCalledWith(momentId);
    });
  });
});

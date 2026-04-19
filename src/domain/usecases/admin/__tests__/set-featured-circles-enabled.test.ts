import { describe, it, expect } from "vitest";
import { setFeaturedCirclesEnabled } from "@/domain/usecases/admin/set-featured-circles-enabled";
import { AdminUnauthorizedError } from "@/domain/errors";
import { createMockSiteSettingsRepository } from "@/domain/usecases/__tests__/helpers/mock-site-settings-repository";

describe("setFeaturedCirclesEnabled", () => {
  describe("given a non-admin caller", () => {
    it("should throw AdminUnauthorizedError and not touch the repository", async () => {
      const siteSettingsRepository = createMockSiteSettingsRepository();

      await expect(
        setFeaturedCirclesEnabled("USER", false, { siteSettingsRepository })
      ).rejects.toThrow(AdminUnauthorizedError);

      expect(siteSettingsRepository.setFeaturedCirclesEnabled).not.toHaveBeenCalled();
    });
  });

  describe("given an admin caller", () => {
    it("should disable the featured section", async () => {
      const siteSettingsRepository = createMockSiteSettingsRepository();

      const result = await setFeaturedCirclesEnabled("ADMIN", false, { siteSettingsRepository });

      expect(siteSettingsRepository.setFeaturedCirclesEnabled).toHaveBeenCalledWith(false);
      expect(result.featuredCirclesEnabled).toBe(false);
    });

    it("should enable the featured section", async () => {
      const siteSettingsRepository = createMockSiteSettingsRepository();

      const result = await setFeaturedCirclesEnabled("ADMIN", true, { siteSettingsRepository });

      expect(siteSettingsRepository.setFeaturedCirclesEnabled).toHaveBeenCalledWith(true);
      expect(result.featuredCirclesEnabled).toBe(true);
    });
  });
});

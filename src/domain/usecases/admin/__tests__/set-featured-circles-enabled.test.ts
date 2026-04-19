import { describe, it, expect, vi } from "vitest";
import { setFeaturedCirclesEnabled } from "@/domain/usecases/admin/set-featured-circles-enabled";
import { AdminUnauthorizedError } from "@/domain/errors";
import type { SiteSettings } from "@/domain/models/site-settings";
import type { SiteSettingsRepository } from "@/domain/ports/repositories/site-settings-repository";

function makeSiteSettings(overrides: Partial<SiteSettings> = {}): SiteSettings {
  return {
    featuredCirclesEnabled: true,
    updatedAt: new Date("2026-04-19T10:00:00Z"),
    ...overrides,
  };
}

function createMockSiteSettingsRepository(
  overrides: Partial<SiteSettingsRepository> = {}
): SiteSettingsRepository {
  return {
    getSettings: vi.fn<SiteSettingsRepository["getSettings"]>().mockResolvedValue(makeSiteSettings()),
    setFeaturedCirclesEnabled: vi
      .fn<SiteSettingsRepository["setFeaturedCirclesEnabled"]>()
      .mockImplementation(async (enabled) => makeSiteSettings({ featuredCirclesEnabled: enabled })),
    ...overrides,
  };
}

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

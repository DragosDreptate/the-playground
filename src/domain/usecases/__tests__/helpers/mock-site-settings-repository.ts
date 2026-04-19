import type { SiteSettingsRepository } from "@/domain/ports/repositories/site-settings-repository";
import type { SiteSettings } from "@/domain/models/site-settings";
import { vi } from "vitest";

export function makeSiteSettings(overrides: Partial<SiteSettings> = {}): SiteSettings {
  return {
    featuredCirclesEnabled: true,
    ...overrides,
  };
}

export function createMockSiteSettingsRepository(
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

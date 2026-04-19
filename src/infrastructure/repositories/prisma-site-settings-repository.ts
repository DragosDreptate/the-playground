import { prisma } from "@/infrastructure/db/prisma";
import type { SiteSettings } from "@/domain/models/site-settings";
import type { SiteSettingsRepository } from "@/domain/ports/repositories/site-settings-repository";

const SETTINGS_ID = "default";

function toDomain(record: {
  featuredCirclesEnabled: boolean;
  updatedAt: Date;
}): SiteSettings {
  return {
    featuredCirclesEnabled: record.featuredCirclesEnabled,
    updatedAt: record.updatedAt,
  };
}

export const prismaSiteSettingsRepository: SiteSettingsRepository = {
  async getSettings(): Promise<SiteSettings> {
    const record = await prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: { id: SETTINGS_ID },
    });
    return toDomain(record);
  },

  async setFeaturedCirclesEnabled(enabled: boolean): Promise<SiteSettings> {
    const record = await prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      update: { featuredCirclesEnabled: enabled },
      create: { id: SETTINGS_ID, featuredCirclesEnabled: enabled },
    });
    return toDomain(record);
  },
};

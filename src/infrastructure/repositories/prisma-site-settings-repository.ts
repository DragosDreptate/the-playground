import { prisma } from "@/infrastructure/db/prisma";
import type { SiteSettings } from "@/domain/models/site-settings";
import type { SiteSettingsRepository } from "@/domain/ports/repositories/site-settings-repository";

const SETTINGS_ID = "default";

export const prismaSiteSettingsRepository: SiteSettingsRepository = {
  async getSettings(): Promise<SiteSettings> {
    const record = await prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: { id: SETTINGS_ID },
      select: { featuredCirclesEnabled: true },
    });
    return record;
  },

  async setFeaturedCirclesEnabled(enabled: boolean): Promise<SiteSettings> {
    const record = await prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      update: { featuredCirclesEnabled: enabled },
      create: { id: SETTINGS_ID, featuredCirclesEnabled: enabled },
      select: { featuredCirclesEnabled: true },
    });
    return record;
  },
};

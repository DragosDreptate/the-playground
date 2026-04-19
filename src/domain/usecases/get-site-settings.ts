import type { SiteSettings } from "@/domain/models/site-settings";
import type { SiteSettingsRepository } from "@/domain/ports/repositories/site-settings-repository";

type Deps = { siteSettingsRepository: SiteSettingsRepository };

export async function getSiteSettings(deps: Deps): Promise<SiteSettings> {
  return deps.siteSettingsRepository.getSettings();
}

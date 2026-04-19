import type { UserRole } from "@/domain/models/user";
import type { SiteSettings } from "@/domain/models/site-settings";
import type { SiteSettingsRepository } from "@/domain/ports/repositories/site-settings-repository";
import { AdminUnauthorizedError } from "@/domain/errors";

type Deps = { siteSettingsRepository: SiteSettingsRepository };

export async function setFeaturedCirclesEnabled(
  callerRole: UserRole,
  enabled: boolean,
  deps: Deps
): Promise<SiteSettings> {
  if (callerRole !== "ADMIN") throw new AdminUnauthorizedError();
  return deps.siteSettingsRepository.setFeaturedCirclesEnabled(enabled);
}

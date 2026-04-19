import type { SiteSettings } from "@/domain/models/site-settings";

export interface SiteSettingsRepository {
  /** Lit les settings (crée la row avec les valeurs par défaut à la première lecture). */
  getSettings(): Promise<SiteSettings>;
  /** Bascule le flag d'affichage de la section "À la une" dans l'Explorer. */
  setFeaturedCirclesEnabled(enabled: boolean): Promise<SiteSettings>;
}

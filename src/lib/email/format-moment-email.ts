import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale/fr";
import { enUS } from "date-fns/locale/en-US";
import type { LocationType } from "@/domain/models/moment";
import { formatTimezoneMention } from "@/lib/timezone";

export function getDateFnsLocale(locale: string) {
  return locale === "fr" ? fr : enUS;
}

export function formatLocationText(
  locationType: LocationType | string,
  locationName: string | null,
  locationAddress: string | null,
  videoLink: string | null,
  locale: string,
): string {
  if (locationType === "ONLINE") {
    return videoLink ?? (locale === "fr" ? "En ligne" : "Online");
  }
  if (locationType === "HYBRID") {
    return (
      [locationName, locationAddress].filter(Boolean).join(", ") ||
      (locale === "fr" ? "Hybride" : "Hybrid")
    );
  }
  return (
    [locationName, locationAddress].filter(Boolean).join(", ") ||
    (locale === "fr" ? "À définir" : "TBD")
  );
}

export type MomentForEmail = {
  startsAt: Date;
  /** Fuseau de l'événement (IANA) : l'email est rendu côté serveur, sans visiteur. */
  timezone: string;
  locationType: LocationType | string;
  locationName: string | null;
  locationAddress: string | null;
  videoLink: string | null;
};

/**
 * Pré-formate les chaînes de date et de lieu d'un événement pour un email,
 * dans la locale du destinataire. Évite la duplication des 4 appels
 * `formatInTimeZone` + `formatLocationText` dans chaque sender.
 *
 * L'heure est exprimée dans le fuseau de l'ÉVÉNEMENT et porte sa mention : un email
 * part vers un destinataire dont on ne connaît ni le fuseau ni l'appareil, donc
 * personne ne peut la convertir pour lui. Sans la mention, l'heure serait ambiguë.
 */
export function buildMomentEmailContext(moment: MomentForEmail, locale: string) {
  const dateFnsLocale = getDateFnsLocale(locale);
  const timezone = moment.timezone;
  return {
    momentDate:
      formatInTimeZone(moment.startsAt, timezone, "EEEE d MMMM yyyy, HH:mm", {
        locale: dateFnsLocale,
      }) + ` (${formatTimezoneMention(timezone, locale)})`,
    momentDateMonth: formatInTimeZone(moment.startsAt, timezone, "MMM", {
      locale: dateFnsLocale,
    }),
    momentDateDay: formatInTimeZone(moment.startsAt, timezone, "d"),
    locationText: formatLocationText(
      moment.locationType,
      moment.locationName,
      moment.locationAddress,
      moment.videoLink,
      locale,
    ),
  };
}

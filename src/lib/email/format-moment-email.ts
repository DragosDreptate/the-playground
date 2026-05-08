import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale/fr";
import { enUS } from "date-fns/locale/en-US";
import type { LocationType } from "@/domain/models/moment";

const PLATFORM_TIMEZONE = "Europe/Paris";

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
  locationType: LocationType | string;
  locationName: string | null;
  locationAddress: string | null;
  videoLink: string | null;
};

/**
 * Pré-formate les chaînes de date et de lieu d'un événement pour un email,
 * dans la locale du destinataire. Évite la duplication des 4 appels
 * `formatInTimeZone` + `formatLocationText` dans chaque sender.
 */
export function buildMomentEmailContext(moment: MomentForEmail, locale: string) {
  const dateFnsLocale = getDateFnsLocale(locale);
  return {
    momentDate: formatInTimeZone(
      moment.startsAt,
      PLATFORM_TIMEZONE,
      "EEEE d MMMM yyyy, HH:mm",
      { locale: dateFnsLocale },
    ),
    momentDateMonth: formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "MMM", {
      locale: dateFnsLocale,
    }),
    momentDateDay: formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "d"),
    locationText: formatLocationText(
      moment.locationType,
      moment.locationName,
      moment.locationAddress,
      moment.videoLink,
      locale,
    ),
  };
}

import type { Moment } from "@/domain/models/moment";
import { routing, type Locale } from "@/i18n/routing";
import {
  generateIcsFeed,
  type IcsFeedEvent,
} from "@/infrastructure/services/email/generate-ics";

export type CircleCalendarFeedLabels = {
  /** Ligne d'inscription en tête de description, reçoit `url` (ex. « Inscription : … »). */
  registerLine: (url: string) => string;
  /** Lieu affiché pour un événement en ligne. */
  online: string;
};

type BuildParams = {
  circleName: string;
  moments: Moment[];
  appUrl: string;
  locale: Locale;
  labels: CircleCalendarFeedLabels;
};

export function momentPublicUrl(appUrl: string, locale: Locale, slug: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return `${appUrl}${prefix}/m/${slug}`;
}

/**
 * Lieu affiché dans l'agenda. Jamais le lien visio (décision D2 de #647) :
 * le flux est public, le lien permettrait de rejoindre sans s'inscrire.
 * Un événement hybride affiche son adresse physique.
 */
function feedLocation(moment: Moment, online: string): string | null {
  if (moment.locationType === "ONLINE") return online;
  const physical = [moment.locationName, moment.locationAddress]
    .filter(Boolean)
    .join(", ");
  if (physical) return physical;
  return moment.locationType === "HYBRID" ? online : null;
}

function toFeedEvent(
  moment: Moment,
  { appUrl, locale, labels }: Omit<BuildParams, "circleName" | "moments">
): IcsFeedEvent {
  const url = momentPublicUrl(appUrl, locale, moment.slug);
  // Le lien d'inscription passe en tête : un abonné n'est pas inscrit et
  // pourrait sinon venir à un événement complet ou sur validation.
  const registerLine = labels.registerLine(url);
  const description = moment.description.trim()
    ? `${registerLine}\n\n${moment.description}`
    : registerLine;

  return {
    uid: moment.id,
    title: moment.title,
    description,
    startsAt: moment.startsAt,
    endsAt: moment.endsAt,
    location: feedLocation(moment, labels.online),
    url,
    cancelled: moment.status === "CANCELLED",
    updatedAt: moment.updatedAt,
  };
}

export function buildCircleCalendarFeed({
  circleName,
  moments,
  ...context
}: BuildParams): string {
  return generateIcsFeed({
    calendarName: `${circleName} · The Playground`,
    events: moments.map((moment) => toFeedEvent(moment, context)),
  });
}

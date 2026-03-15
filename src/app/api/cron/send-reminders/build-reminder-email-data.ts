import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale/fr";
import { generateIcs } from "@/infrastructure/services/email/generate-ics";
import type { MomentForReminder } from "@/domain/ports/repositories/moment-repository";
import type { RegistrationReminderEmailData } from "@/domain/ports/services/email-service";

const PLATFORM_TIMEZONE = "Europe/Paris";

function formatMomentDate(startsAt: Date): string {
  return formatInTimeZone(startsAt, PLATFORM_TIMEZONE, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
}

function formatMomentDateMonth(startsAt: Date): string {
  return formatInTimeZone(startsAt, PLATFORM_TIMEZONE, "MMM", { locale: fr }).toUpperCase();
}

function formatMomentDateDay(startsAt: Date): string {
  return formatInTimeZone(startsAt, PLATFORM_TIMEZONE, "d");
}

export function formatLocationText(moment: MomentForReminder): string {
  if (moment.locationType === "ONLINE") return moment.videoLink ?? "En ligne";
  if (moment.locationType === "HYBRID") return moment.locationName ?? "Hybride";
  return moment.locationName ?? "Lieu à confirmer";
}

/** Génère le contenu ICS une seule fois par événement (METHOD:PUBLISH, invariant pour tous les inscrits). */
export function buildMomentIcs(
  moment: MomentForReminder,
  appUrl: string
): string {
  return generateIcs({
    uid: moment.id,
    title: moment.title,
    description: moment.description,
    startsAt: moment.startsAt,
    endsAt: moment.endsAt,
    location: formatLocationText(moment),
    videoLink: moment.videoLink,
    url: `${appUrl}/m/${moment.slug}`,
    organizerName: moment.circle.name,
    method: "PUBLISH",
  });
}

export function buildReminderEmailData(
  moment: MomentForReminder,
  user: { email: string; name: string | null },
  icsContent: string
): RegistrationReminderEmailData {
  return {
    to: user.email,
    playerName: user.name ?? user.email,
    momentTitle: moment.title,
    momentSlug: moment.slug,
    momentDate: formatMomentDate(moment.startsAt),
    momentDateMonth: formatMomentDateMonth(moment.startsAt),
    momentDateDay: formatMomentDateDay(moment.startsAt),
    locationText: formatLocationText(moment),
    circleName: moment.circle.name,
    circleSlug: moment.circle.slug,
    icsContent,
    strings: {
      subject: `Rappel : ${moment.title} — demain`,
      heading: `C'est demain ! Voici un rappel pour votre événement.`,
      dateLabel: "Date",
      locationLabel: "Lieu",
      viewMomentCta: "Voir l'événement",
      footer: `Vous recevez ce rappel car vous êtes inscrit(e) à cet événement sur The Playground.`,
    },
  };
}

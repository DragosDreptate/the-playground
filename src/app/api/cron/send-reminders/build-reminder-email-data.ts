import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale/fr";
import { generateIcs } from "@/infrastructure/services/email/generate-ics";
import type { MomentForReminder } from "@/domain/ports/repositories/moment-repository";
import type { RegistrationReminderEmailData } from "@/domain/ports/services/email-service";
import { formatTimezoneMention } from "@/lib/timezone";

// Le rappel part par email : aucun visiteur, donc aucun fuseau à qui s'adapter.
// L'heure est celle de l'événement, et elle porte sa mention. Voir ADR-0008.
function formatMomentDate(startsAt: Date, timezone: string): string {
  const time = formatInTimeZone(startsAt, timezone, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
  return `${time} (${formatTimezoneMention(timezone, "fr")})`;
}

function formatMomentDateMonth(startsAt: Date, timezone: string): string {
  return formatInTimeZone(startsAt, timezone, "MMM", { locale: fr }).toUpperCase();
}

function formatMomentDateDay(startsAt: Date, timezone: string): string {
  return formatInTimeZone(startsAt, timezone, "d");
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
    momentDate: formatMomentDate(moment.startsAt, moment.timezone),
    momentDateMonth: formatMomentDateMonth(moment.startsAt, moment.timezone),
    momentDateDay: formatMomentDateDay(moment.startsAt, moment.timezone),
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

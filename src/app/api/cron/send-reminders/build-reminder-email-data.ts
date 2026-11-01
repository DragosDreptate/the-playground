import { generateIcs } from "@/infrastructure/services/email/generate-ics";
import type { MomentForReminder } from "@/domain/ports/repositories/moment-repository";
import type { RegistrationReminderEmailData } from "@/domain/ports/services/email-service";
import { buildMomentEmailContext } from "@/lib/email/format-moment-email";

export type ReminderStrings = RegistrationReminderEmailData["strings"];

/** Génère le contenu ICS une fois par événement et par langue (METHOD:PUBLISH). */
export function buildMomentIcs(
  moment: MomentForReminder,
  appUrl: string,
  locale: string
): string {
  return generateIcs({
    uid: moment.id,
    title: moment.title,
    description: moment.description,
    startsAt: moment.startsAt,
    endsAt: moment.endsAt,
    location: buildMomentEmailContext(moment, locale).locationText,
    videoLink: moment.videoLink,
    url: `${appUrl}/m/${moment.slug}`,
    organizerName: moment.circle.name,
    method: "PUBLISH",
  });
}

/**
 * Date et lieu mis en forme comme dans les autres emails (`buildMomentEmailContext`) :
 * heure de l'événement avec sa mention (le rappel est un email, sans visiteur,
 * voir ADR-0008), dans la langue de l'inscrit.
 */
export function buildReminderEmailData(
  moment: MomentForReminder,
  user: { email: string; name: string | null },
  icsContent: string,
  locale: string,
  strings: ReminderStrings
): RegistrationReminderEmailData {
  const ctx = buildMomentEmailContext(moment, locale);
  return {
    to: user.email,
    playerName: user.name ?? user.email,
    momentTitle: moment.title,
    momentSlug: moment.slug,
    momentDate: ctx.momentDate,
    momentDateMonth: ctx.momentDateMonth.toUpperCase(),
    momentDateDay: ctx.momentDateDay,
    locationText: ctx.locationText,
    circleName: moment.circle.name,
    circleSlug: moment.circle.slug,
    icsContent,
    strings,
  };
}

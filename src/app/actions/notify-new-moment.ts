"use server";

import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale/fr";

import { prismaCircleRepository, prismaUserRepository } from "@/infrastructure/repositories";
import { formatTimezoneMention } from "@/lib/timezone";
import { createResendEmailService } from "@/infrastructure/services";
import type { Moment } from "@/domain/models/moment";
import type { NewMomentNotificationStrings } from "@/domain/ports/services/email-service";

const emailService = createResendEmailService();

// Notification serveur (email membres + Slack) : pas de visiteur, donc heure de
// l'événement avec sa mention. Voir ADR-0008.
function formatMomentDate(moment: Moment): string {
  const time = formatInTimeZone(moment.startsAt, moment.timezone, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
  return `${time} (${formatTimezoneMention(moment.timezone, "fr")})`;
}

function formatMomentLocation(moment: Moment): string {
  if (moment.locationType === "ONLINE") return "En ligne";
  if (moment.locationType === "HYBRID") return "Hybride";
  return (
    [moment.locationName, moment.locationAddress].filter(Boolean).join(", ") ||
    "Lieu à confirmer"
  );
}

function formatMomentDateMonth(moment: Moment): string {
  return formatInTimeZone(moment.startsAt, moment.timezone, "MMM", { locale: fr }).toUpperCase();
}

function formatMomentDateDay(moment: Moment): string {
  return formatInTimeZone(moment.startsAt, moment.timezone, "d");
}

function buildMemberStrings(circleName: string): NewMomentNotificationStrings {
  return {
    subject: `🎉 Nouvel événement — ${circleName}`,
    preheader: `Un nouvel événement vient d'être publié dans votre Communauté`,
    heading: `Nouvel événement dans ${circleName}`,
    intro: "Un nouvel événement vient d'être publié dans votre Communauté :",
    dateLabel: "Date",
    locationLabel: "Lieu",
    ctaLabel: "S'inscrire",
    unsubscribeText: `Vous recevez cet email car vous êtes membre de ${circleName} sur The Playground.`,
    unsubscribeLabel: "Voir la Communauté",
  };
}

export async function notifyNewMoment(
  moment: Moment,
  creatorId: string,
  circleName: string,
  circleSlug: string
): Promise<void> {
  const members = await prismaCircleRepository.findPlayersForNewMomentNotification(
    moment.circleId,
    creatorId
  );

  const momentDate = formatMomentDate(moment);
  const momentDateMonth = formatMomentDateMonth(moment);
  const momentDateDay = formatMomentDateDay(moment);
  const momentLocation = formatMomentLocation(moment);
  const memberStrings = buildMemberStrings(circleName);

  const allUserIds = members.map((m) => m.userId);
  const prefsMap = await prismaUserRepository.findNotificationPreferencesByIds(allUserIds);

  const recipients = members
    .filter((m) => prefsMap.get(m.userId)?.notifyNewMomentInCircle !== false)
    .map((m) => ({ to: m.email, recipientName: m.firstName ?? m.email }));

  if (recipients.length === 0) return;

  await emailService.sendNewMomentToMembers({
    recipients,
    circleName,
    circleSlug,
    momentTitle: moment.title,
    momentSlug: moment.slug,
    momentDate,
    momentDateMonth,
    momentDateDay,
    momentLocation,
    strings: memberStrings,
  });
}

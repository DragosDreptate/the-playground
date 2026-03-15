"use server";

import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale/fr";

const PLATFORM_TIMEZONE = "Europe/Paris";
import { prismaCircleRepository, prismaUserRepository } from "@/infrastructure/repositories";
import { createResendEmailService } from "@/infrastructure/services";
import type { Moment } from "@/domain/models/moment";
import type { NewMomentNotificationStrings } from "@/domain/ports/services/email-service";

const emailService = createResendEmailService();

function formatMomentDate(moment: Moment): string {
  return formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
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
  return formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "MMM", { locale: fr }).toUpperCase();
}

function formatMomentDateDay(moment: Moment): string {
  return formatInTimeZone(moment.startsAt, PLATFORM_TIMEZONE, "d");
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

  // Notifier les membres (excluant déjà le créateur) qui ont activé les notifications
  const memberResults = await Promise.allSettled(
    members.map(async (m) => {
      const prefs = prefsMap.get(m.userId);
      if (!prefs?.notifyNewMomentInCircle) return;

      return emailService.sendNewMomentToMember({
        to: m.email,
        recipientName: m.firstName ?? m.email,
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
    })
  );

  memberResults.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(
        `[notifyNewMoment] Échec envoi email membre ${members[i]?.email}:`,
        result.reason
      );
    }
  });
}

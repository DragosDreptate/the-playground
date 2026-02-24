"use server";

import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { prismaCircleRepository } from "@/infrastructure/repositories";
import { createResendEmailService } from "@/infrastructure/services";
import type { Moment } from "@/domain/models/moment";
import type { NewMomentNotificationStrings } from "@/domain/ports/services/email-service";

const emailService = createResendEmailService();

function formatMomentDate(moment: Moment): string {
  return format(moment.startsAt, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
}

function formatMomentLocation(moment: Moment): string {
  if (moment.locationType === "ONLINE") return "En ligne";
  if (moment.locationType === "HYBRID") return "Hybride";
  return (
    [moment.locationName, moment.locationAddress].filter(Boolean).join(", ") ||
    "Lieu à confirmer"
  );
}

function buildFollowerStrings(circleName: string): NewMomentNotificationStrings {
  return {
    subject: `🎉 Nouvel événement — ${circleName}`,
    preheader: `Un nouvel événement vient d'être publié dans ${circleName}`,
    heading: `Nouvel événement dans ${circleName}`,
    intro: "Un nouvel événement vient d'être publié dans une Communauté que vous suivez :",
    ctaLabel: "S'inscrire",
    unsubscribeText: `Vous recevez cet email car vous suivez ${circleName} sur The Playground.`,
    unsubscribeLabel: "Se désabonner",
  };
}

function buildMemberStrings(circleName: string): NewMomentNotificationStrings {
  return {
    subject: `🎉 Nouvel événement — ${circleName}`,
    preheader: `Un nouvel événement vient d'être publié dans votre Communauté`,
    heading: `Nouvel événement dans ${circleName}`,
    intro: "Un nouvel événement vient d'être publié dans votre Communauté :",
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
  const [followers, members] = await Promise.all([
    prismaCircleRepository.findFollowers(moment.circleId),
    prismaCircleRepository.findPlayersForNewMomentNotification(
      moment.circleId,
      creatorId
    ),
  ]);

  const momentDate = formatMomentDate(moment);
  const momentLocation = formatMomentLocation(moment);

  const followerStrings = buildFollowerStrings(circleName);
  const memberStrings = buildMemberStrings(circleName);

  // Déduplication : un follower qui est aussi membre ne doit recevoir qu'un seul email (le mail membre)
  const memberUserIds = new Set(members.map((m) => m.userId));

  const followersToNotify = followers.filter((f) => !memberUserIds.has(f.userId));

  // Notifier les followers (non-membres)
  await Promise.allSettled(
    followersToNotify.map((f) =>
      emailService.sendNewMomentToFollower({
        to: f.email,
        recipientName: f.firstName ?? f.email,
        circleName,
        circleSlug,
        momentTitle: moment.title,
        momentSlug: moment.slug,
        momentDate,
        momentLocation,
        strings: followerStrings,
      })
    )
  );

  // Notifier les membres (excluant déjà le créateur via findPlayersForNewMomentNotification)
  await Promise.allSettled(
    members.map((m) =>
      emailService.sendNewMomentToMember({
        to: m.email,
        recipientName: m.firstName ?? m.email,
        circleName,
        circleSlug,
        momentTitle: moment.title,
        momentSlug: moment.slug,
        momentDate,
        momentLocation,
        strings: memberStrings,
      })
    )
  );
}

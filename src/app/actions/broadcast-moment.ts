"use server";

import * as Sentry from "@sentry/nextjs";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale/fr";

const PLATFORM_TIMEZONE = "Europe/Paris";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaMomentRepository,
  prismaCircleRepository,
  prismaUserRepository,
} from "@/infrastructure/repositories";
import { createResendEmailService } from "@/infrastructure/services";
import type { ActionResult } from "./types";

const emailService = createResendEmailService();

function formatMomentDate(startsAt: Date): string {
  return formatInTimeZone(startsAt, PLATFORM_TIMEZONE, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
}

export async function broadcastMomentAction(
  momentId: string,
  customMessage?: string
): Promise<ActionResult<{ recipientCount: number }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié", code: "UNAUTHORIZED" };
  }

  const moment = await prismaMomentRepository.findById(momentId);
  if (!moment) {
    return { success: false, error: "Événement introuvable", code: "NOT_FOUND" };
  }

  const membership = await prismaCircleRepository.findMembership(
    moment.circleId,
    session.user.id
  );
  if (!membership || membership.role !== "HOST") {
    return {
      success: false,
      error: "Seul l'organisateur peut diffuser",
      code: "FORBIDDEN",
    };
  }

  const COOLDOWN_MS = 24 * 60 * 60 * 1000;
  if (
    moment.broadcastSentAt !== null &&
    Date.now() - moment.broadcastSentAt.getTime() < COOLDOWN_MS
  ) {
    return {
      success: false,
      error: "L'invitation a déjà été envoyée. Vous pourrez renvoyer dans 24h.",
      code: "COOLDOWN",
    };
  }

  // Mark before send — anti race condition (écrase le timestamp à chaque envoi)
  await prismaMomentRepository.markBroadcastSent(momentId);

  const circle = await prismaCircleRepository.findById(moment.circleId);
  const circleName = circle?.name ?? "";

  const [members, followers] = await Promise.all([
    prismaCircleRepository.findPlayersForNewMomentNotification(
      moment.circleId,
      session.user.id
    ),
    prismaCircleRepository.findFollowers(moment.circleId),
  ]);

  // Déduplication : follower déjà membre → ne recevoir que l'email membre
  const memberUserIds = new Set(members.map((m) => m.userId));
  const followersToNotify = followers.filter((f) => !memberUserIds.has(f.userId));

  const allRecipients = [
    ...members.map((m) => ({ ...m, isMember: true })),
    ...followersToNotify.map((f) => ({ ...f, isMember: false })),
  ];

  const allUserIds = allRecipients.map((r) => r.userId);
  const prefsMap = await prismaUserRepository.findNotificationPreferencesByIds(allUserIds);

  const momentDate = formatMomentDate(moment.startsAt);
  const momentLocation =
    moment.locationType === "ONLINE"
      ? "En ligne"
      : moment.locationType === "HYBRID"
        ? "Hybride"
        : [moment.locationName, moment.locationAddress].filter(Boolean).join(", ") || null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const recipientsToEmail = allRecipients.filter((r) => {
    const prefs = prefsMap.get(r.userId);
    return prefs?.notifyNewMomentInCircle !== false;
  });

  // Fire-and-forget — ne bloque pas le retour de l'action
  Promise.allSettled(
    recipientsToEmail.map((recipient) =>
      emailService.sendBroadcastMoment({
        to: recipient.email,
        strings: {
          subject: `Vous êtes invité(e) : ${moment.title}`,
          preheader: `${circleName} vous invite à rejoindre cet événement`,
          heading: `${circleName} vous invite`,
          intro: `${circleName} partage un événement avec vous :`,
          customMessage: customMessage?.trim() || undefined,
          ctaLabel: "Voir l'événement",
          unsubscribeText: `Vous recevez cet email car vous suivez ${circleName} sur The Playground.`,
          unsubscribeLabel: "Gérer mes notifications",
        },
        momentTitle: moment.title,
        momentDate,
        momentLocation,
        circleName,
        momentSlug: moment.slug,
        appUrl,
      })
    )
  ).catch((err) => {
    Sentry.captureException(err);
  });

  revalidatePath(`/dashboard/circles/${circle?.slug}/moments/${moment.slug}`);

  return { success: true, data: { recipientCount: recipientsToEmail.length } };
}

"use server";

import * as Sentry from "@sentry/nextjs";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale/fr";
import { enUS } from "date-fns/locale/en-US";
import { getLocale, getTranslations } from "next-intl/server";

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
import { isAdminInHostMode } from "@/lib/admin-host-mode";

const emailService = createResendEmailService();

function formatMomentDate(startsAt: Date, locale: string): string {
  const dateFnsLocale = locale === "fr" ? fr : enUS;
  const pattern = locale === "fr"
    ? "EEEE d MMMM yyyy 'à' HH:mm"
    : "EEEE, MMMM d yyyy 'at' h:mm a";
  return formatInTimeZone(startsAt, PLATFORM_TIMEZONE, pattern, { locale: dateFnsLocale });
}

function formatMomentDateMonth(startsAt: Date, locale: string): string {
  const dateFnsLocale = locale === "fr" ? fr : enUS;
  return formatInTimeZone(startsAt, PLATFORM_TIMEZONE, "MMM", { locale: dateFnsLocale }).toUpperCase();
}

function formatMomentDateDay(startsAt: Date): string {
  return formatInTimeZone(startsAt, PLATFORM_TIMEZONE, "d");
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

  if (!(await isAdminInHostMode(session))) {
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

  const members = await prismaCircleRepository.findPlayersForNewMomentNotification(
    moment.circleId,
    session.user.id
  );

  const allRecipients = members;
  const allUserIds = allRecipients.map((r) => r.userId);
  const prefsMap = await prismaUserRepository.findNotificationPreferencesByIds(allUserIds);

  // Résoudre la locale dans le contexte de la request
  const locale = await getLocale();
  const t = await getTranslations("Email.broadcastMoment");

  const momentDate = formatMomentDate(moment.startsAt, locale);
  const momentDateMonth = formatMomentDateMonth(moment.startsAt, locale);
  const momentDateDay = formatMomentDateDay(moment.startsAt);
  const momentLocation =
    moment.locationType === "ONLINE"
      ? (locale === "fr" ? "En ligne" : "Online")
      : moment.locationType === "HYBRID"
        ? (locale === "fr" ? "Hybride" : "Hybrid")
        : [moment.locationName, moment.locationAddress].filter(Boolean).join(", ") || null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const hostName = session.user.name ?? session.user.email ?? "";

  const recipientsToEmail = allRecipients.filter((r) => {
    const prefs = prefsMap.get(r.userId);
    return prefs?.notifyNewMomentInCircle !== false;
  });

  // Fire-and-forget — ne bloque pas le retour de l'action
  emailService.sendBroadcastMoments({
    recipients: recipientsToEmail.map((r) => r.email),
    strings: {
      subject: t("subject", { momentTitle: moment.title }),
      preheader: t("preheader", { circleName }),
      heading: t("heading", { circleName }),
      intro: t("intro", { hostName }),
      customMessage: customMessage?.trim() || undefined,
      dateLabel: t("dateLabel"),
      locationLabel: t("locationLabel"),
      ctaLabel: t("ctaLabel"),
      unsubscribeText: t("unsubscribeText", { circleName }),
      unsubscribeLabel: t("unsubscribeLabel"),
    },
    momentTitle: moment.title,
    momentDate,
    momentDateMonth,
    momentDateDay,
    momentLocation,
    circleName,
    momentSlug: moment.slug,
    appUrl,
  }).catch((err) => {
    Sentry.captureException(err);
  });

  revalidatePath(`/dashboard/circles/${circle?.slug}/moments/${moment.slug}`);

  return { success: true, data: { recipientCount: recipientsToEmail.length } };
}

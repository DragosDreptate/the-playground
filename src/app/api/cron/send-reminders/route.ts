import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { prismaMomentRepository } from "@/infrastructure/repositories";
import { createResendEmailService } from "@/infrastructure/services";
import { getTranslations } from "next-intl/server";
import { toRecipientLocale } from "@/lib/email/email-locale";
import type { Locale } from "@/i18n/routing";
import type { MomentForReminder } from "@/domain/ports/repositories/moment-repository";
import type { RegistrationReminderEmailData } from "@/domain/ports/services/email-service";
import {
  buildMomentIcs,
  buildReminderEmailData,
  type ReminderStrings,
} from "./build-reminder-email-data";

/**
 * GET /api/cron/send-reminders
 *
 * Envoie les rappels email 24h avant chaque événement PUBLISHED.
 * Fenêtre : événements démarrant entre now+22h et now+26h.
 * Idempotence : reminder24hSentAt sur le Moment — un seul envoi garanti.
 *
 * Déclenché toutes les heures via Vercel Cron (vercel.json).
 * Vercel Cron invoque les endpoints en GET — on expose aussi POST pour
 * permettre un déclenchement manuel (scripts, curl, tests).
 * Protection : header Authorization: Bearer CRON_SECRET
 */

const emailService = createResendEmailService();
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function buildReminderStrings(locale: Locale, momentTitle: string): Promise<ReminderStrings> {
  const t = await getTranslations({ locale, namespace: "Email" });
  return {
    subject: t("reminder.subject", { momentTitle }),
    heading: t("reminder.heading"),
    dateLabel: t("common.dateLabel"),
    locationLabel: t("common.locationLabel"),
    viewMomentCta: t("common.viewMomentCta"),
    footer: t("reminder.footer"),
  };
}

/**
 * Un email par inscrit, dans la langue mémorisée sur son compte. Textes et ICS
 * calculés une fois par langue présente parmi les inscrits.
 */
async function buildMomentReminders(
  moment: MomentForReminder
): Promise<RegistrationReminderEmailData[]> {
  const perLocale = new Map<Locale, { strings: ReminderStrings; icsContent: string }>();
  const reminders: RegistrationReminderEmailData[] = [];
  for (const user of moment.registeredUsers) {
    const locale = toRecipientLocale(user.preferredLocale);
    let localized = perLocale.get(locale);
    if (!localized) {
      localized = {
        strings: await buildReminderStrings(locale, moment.title),
        icsContent: buildMomentIcs(moment, APP_URL, locale),
      };
      perLocale.set(locale, localized);
    }
    reminders.push(
      buildReminderEmailData(moment, user, localized.icsContent, locale, localized.strings)
    );
  }
  return reminders;
}

async function handler(request: NextRequest) {
  // 1. Auth check
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    Sentry.captureMessage(
      "[cron] send-reminders: unauthorized request",
      "warning"
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const now = new Date();
  const windowStart = new Date(now.getTime() + 22 * 60 * 60 * 1000); // +22h
  const windowEnd = new Date(now.getTime() + 26 * 60 * 60 * 1000);   // +26h

  try {
    const moments = await prismaMomentRepository.findMomentsNeedingReminder(windowStart, windowEnd);

    let totalSent = 0;

    for (const moment of moments) {
      if (moment.registeredUsers.length > 0) {
        const emailDataList = await buildMomentReminders(moment);
        await emailService.sendRegistrationReminderBatch(emailDataList);
        totalSent += emailDataList.length;
      }

      await prismaMomentRepository.markReminderSent(moment.id);
    }

    const durationMs = Date.now() - startedAt;
    console.log(
      `[send-reminders] ${moments.length} événement(s) traité(s), ${totalSent} email(s) envoyé(s) en ${durationMs}ms`
    );

    return NextResponse.json({
      success: true,
      processed: moments.length,
      sent: totalSent,
      durationMs,
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error(`[send-reminders] Erreur après ${durationMs}ms :`, error);
    Sentry.captureException(error, {
      tags: { cron: "send-reminders" },
      extra: { durationMs },
    });
    return NextResponse.json(
      { error: "Reminder sending failed" },
      { status: 500 }
    );
  }
}

export { handler as GET, handler as POST };

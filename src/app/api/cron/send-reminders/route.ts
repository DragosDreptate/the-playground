import { NextRequest, NextResponse } from "next/server";
import { prismaMomentRepository } from "@/infrastructure/repositories";
import { createResendEmailService } from "@/infrastructure/services";
import { buildReminderEmailData } from "./build-reminder-email-data";

/**
 * POST /api/cron/send-reminders
 *
 * Envoie les rappels email 24h avant chaque événement PUBLISHED.
 * Fenêtre : événements démarrant entre now+22h et now+26h.
 * Idempotence : reminder24hSentAt sur le Moment — un seul envoi garanti.
 *
 * Déclenché toutes les heures via Vercel Cron (vercel.json).
 * Protection : header Authorization: Bearer CRON_SECRET
 */
export async function POST(request: NextRequest) {
  // 1. Auth check
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const now = new Date();
  const windowStart = new Date(now.getTime() + 22 * 60 * 60 * 1000); // +22h
  const windowEnd = new Date(now.getTime() + 26 * 60 * 60 * 1000);   // +26h

  try {
    const emailService = createResendEmailService();
    const moments = await prismaMomentRepository.findMomentsNeedingReminder(windowStart, windowEnd);

    let totalSent = 0;

    for (const moment of moments) {
      if (moment.registeredUsers.length > 0) {
        const emailDataList = moment.registeredUsers.map((user) =>
          buildReminderEmailData(moment, user)
        );
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
    return NextResponse.json(
      { error: "Reminder sending failed" },
      { status: 500 }
    );
  }
}

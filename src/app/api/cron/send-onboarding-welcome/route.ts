import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/db/prisma";
import { createResendEmailService } from "@/infrastructure/services";
import { prismaUserRepository } from "@/infrastructure/repositories";

/**
 * GET /api/cron/send-onboarding-welcome
 *
 * Envoie la lettre du fondateur (email d'onboarding) aux utilisateurs
 * ayant complété leur profil depuis plus de 24h.
 *
 * Critères d'éligibilité :
 * - onboardingCompleted = true
 * - welcomeEmailSentAt = null (pas encore envoyé)
 * - role != ADMIN
 * - createdAt <= now - 3h (délai minimum avant envoi)
 * - Exclut les emails @test.playground et @demo.playground
 *
 * Déclenché chaque jour à 6h UTC (≈ 8h Paris été / 7h Paris hiver)
 * via Vercel Cron (vercel.json).
 */

const DELAY_HOURS = 3;

const emailService = createResendEmailService();

async function handler(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    Sentry.captureMessage(
      "[cron] send-onboarding-welcome: unauthorized request",
      "warning",
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const cutoff = new Date(Date.now() - DELAY_HOURS * 60 * 60 * 1000);

  try {
    const users = await prisma.user.findMany({
      where: {
        onboardingCompleted: true,
        welcomeEmailSentAt: null,
        role: { not: "ADMIN" },
        createdAt: { lte: cutoff },
        AND: [
          { email: { not: { endsWith: "@test.playground" } } },
          { email: { not: { endsWith: "@demo.playground" } } },
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
      },
    });

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await prismaUserRepository.setWelcomeEmailSent(user.id);
        await emailService.sendOnboardingWelcome({
          to: user.email,
          firstName: user.firstName,
        });
        sent++;
      } catch (e) {
        failed++;
        Sentry.captureException(e, {
          tags: { cron: "send-onboarding-welcome" },
          extra: { userId: user.id, email: user.email },
        });
      }
    }

    const durationMs = Date.now() - startedAt;
    console.log(
      `[send-onboarding-welcome] ${users.length} éligible(s), ${sent} envoyé(s), ${failed} échoué(s) en ${durationMs}ms`,
    );

    return NextResponse.json({
      success: true,
      eligible: users.length,
      sent,
      failed,
      durationMs,
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error(`[send-onboarding-welcome] Erreur après ${durationMs}ms :`, error);
    Sentry.captureException(error, {
      tags: { cron: "send-onboarding-welcome" },
      extra: { durationMs },
    });
    return NextResponse.json(
      { error: "Onboarding welcome sending failed" },
      { status: 500 },
    );
  }
}

export { handler as GET, handler as POST };

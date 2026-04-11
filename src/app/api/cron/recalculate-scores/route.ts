import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { recalculateAllScores } from "@/infrastructure/services/recalculate-all-scores";
import { prismaRateLimiter } from "@/infrastructure/services/rate-limiter/prisma-rate-limiter";

/**
 * GET /api/cron/recalculate-scores
 *
 * Batch quotidien de recalcul des scores Explorer pour toutes les Communautés
 * (publiques ET privées) et leurs événements publics à venir.
 *
 * Les Communautés privées sont scorées pour qu'elles aient un score prêt
 * si elles passent en publique entre deux exécutions du cron.
 * Elles n'apparaissent jamais sur Explorer (filtre visibility: PUBLIC dans les requêtes Explorer).
 *
 * Déclenché chaque nuit à 3h via Vercel Cron (vercel.json).
 * Vercel Cron invoque les endpoints en GET — on expose aussi POST pour
 * permettre un déclenchement manuel (scripts, curl, tests).
 * Protection : header Authorization: Bearer CRON_SECRET
 */
async function handler(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    Sentry.captureMessage(
      "[cron] recalculate-scores: unauthorized request",
      "warning"
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await recalculateAllScores();
    console.log(
      `[recalculate-scores] ${result.circles} Communautés, ${result.moments} événements mis à jour en ${result.durationMs}ms`
    );

    // Purge des entrées de rate limiting expirées (> 1 heure)
    const purged = await prismaRateLimiter.purgeExpired(60 * 60 * 1000);
    if (purged > 0) {
      console.log(`[recalculate-scores] ${purged} entrée(s) rate_limits purgée(s)`);
    }

    return NextResponse.json({ success: true, ...result, rateLimitsPurged: purged });
  } catch (error) {
    console.error("[recalculate-scores] Erreur :", error);
    Sentry.captureException(error, {
      tags: { cron: "recalculate-scores" },
    });
    return NextResponse.json({ error: "Score recalculation failed" }, { status: 500 });
  }
}

export { handler as GET, handler as POST };

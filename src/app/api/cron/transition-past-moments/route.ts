import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { prismaMomentRepository } from "@/infrastructure/repositories";

/**
 * GET /api/cron/transition-past-moments
 *
 * Fait transitionner tout Moment PUBLISHED terminé vers le statut PAST.
 * Logique : status = PUBLISHED AND (endsAt <= now OR (endsAt IS NULL AND startsAt <= now)).
 * Idempotente : un moment déjà PAST n'est pas affecté.
 *
 * Remplace l'appel `after(() => transitionPastMoments())` qui tournait sur
 * chaque chargement du dashboard et de la page événement. Problèmes résolus :
 *  - after() sur Vercel serverless est "best effort" et peut être coupé
 *  - chaque page view consommait une connexion pool et du compute
 *  - exécution redondante alors que la transition dépend uniquement du temps
 *
 * Déclenché toutes les 5 minutes via Vercel Cron. Staleness max = 5 min,
 * acceptable UX (bandeau "Terminé", grayscale, catégorisation upcoming/past).
 *
 * Protection : header Authorization: Bearer CRON_SECRET.
 */

async function handler(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    Sentry.captureMessage(
      "[cron] transition-past-moments: unauthorized request",
      "warning"
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();

  try {
    const count = await prismaMomentRepository.transitionPastMoments();
    const durationMs = Date.now() - startedAt;

    if (count > 0) {
      console.log(
        `[transition-past-moments] ${count} événement(s) basculé(s) en PAST en ${durationMs}ms`
      );
    }

    return NextResponse.json({ success: true, transitioned: count, durationMs });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error(
      `[transition-past-moments] Erreur après ${durationMs}ms :`,
      error
    );
    Sentry.captureException(error, {
      tags: { cron: "transition-past-moments" },
      extra: { durationMs },
    });
    return NextResponse.json(
      { error: "Transition failed" },
      { status: 500 }
    );
  }
}

export { handler as GET, handler as POST };

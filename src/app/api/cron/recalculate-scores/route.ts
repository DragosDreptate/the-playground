import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/db/prisma";
import { excludeTestHostFilter } from "@/infrastructure/db/explorer-filters";
import {
  calculateCircleScore,
  calculateMomentScore,
} from "@/infrastructure/services/explorer-score.service";

/**
 * POST /api/cron/recalculate-scores
 *
 * Batch quotidien de recalcul des scores Explorer pour toutes les Communautés
 * (publiques ET privées) et leurs événements publics à venir.
 *
 * Les Communautés privées sont scorées pour qu'elles aient un score prêt
 * si elles passent en publique entre deux exécutions du cron.
 * Elles n'apparaissent jamais sur Explorer (filtre visibility: PUBLIC dans les requêtes Explorer).
 *
 * Déclenché chaque nuit à 3h via Vercel Cron (vercel.json).
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

  try {
    // 2. Calcul des scores Communautés (étape 1 & 2)
    const circles = await prisma.circle.findMany({
      where: {
        excludedFromExplorer: false,
        NOT: excludeTestHostFilter(),
      },
      select: {
        id: true,
        description: true,
        coverImage: true,
        category: true,
        createdAt: true,
        isDemo: true,
        overrideScore: true,
        _count: {
          select: {
            memberships: { where: { role: "PLAYER" } },
          },
        },
        moments: {
          select: {
            status: true,
            startsAt: true,
            _count: {
              select: {
                registrations: { where: { status: "REGISTERED" } },
              },
            },
          },
        },
      },
    });

    const circleScoreMap = new Map<string, number>();

    await prisma.$transaction(
      circles.map((circle) => {
        const pastMoments = circle.moments.filter((m) => m.status === "PAST");
        const hasPastEventWithRegistrant = pastMoments.some(
          (m) => m._count.registrations > 0
        );
        const pastEventCount = pastMoments.length;
        const hasUpcomingEvent = circle.moments.some(
          (m) => m.status === "PUBLISHED" && m.startsAt > now
        );

        const score = calculateCircleScore({
          description: circle.description,
          coverImage: circle.coverImage,
          category: circle.category,
          createdAt: circle.createdAt,
          isDemo: circle.isDemo,
          overrideScore: circle.overrideScore,
          memberCount: circle._count.memberships,
          pastEventCount,
          hasPastEventWithRegistrant,
          hasUpcomingEvent,
        });

        circleScoreMap.set(circle.id, score);

        return prisma.circle.update({
          where: { id: circle.id },
          data: { explorerScore: score, scoreUpdatedAt: now },
        });
      })
    );

    const circlesDuration = Date.now() - startedAt;
    console.log(
      `[recalculate-scores] Circles (public + privées): ${circles.length} mis à jour en ${circlesDuration}ms`
    );

    // 3. Calcul des scores événements (étape 3 & 4)
    const moments = await prisma.moment.findMany({
      where: {
        status: "PUBLISHED",
        startsAt: { gte: now },
        circle: {
          visibility: "PUBLIC",
          excludedFromExplorer: false,
          NOT: excludeTestHostFilter(),
        },
      },
      select: {
        id: true,
        description: true,
        coverImage: true,
        locationName: true,
        circle: {
          select: {
            id: true,
            explorerScore: true,
            isDemo: true,
          },
        },
        _count: {
          select: {
            registrations: { where: { status: "REGISTERED" } },
          },
        },
      },
    });

    await prisma.$transaction(
      moments.map((moment) => {
        // Priorité au score fraîchement calculé en mémoire, fallback sur la valeur persistée
        const circleScore =
          circleScoreMap.get(moment.circle.id) ?? moment.circle.explorerScore ?? 0;

        const score = calculateMomentScore({
          description: moment.description,
          coverImage: moment.coverImage,
          locationName: moment.locationName,
          registrantCount: moment._count.registrations,
          circleScore,
          circleIsDemo: moment.circle.isDemo,
        });

        return prisma.moment.update({
          where: { id: moment.id },
          data: { explorerScore: score },
        });
      })
    );

    const totalDuration = Date.now() - startedAt;
    console.log(
      `[recalculate-scores] Moments: ${moments.length} mis à jour en ${totalDuration}ms`
    );

    return NextResponse.json({
      success: true,
      circles: circles.length,
      moments: moments.length,
      durationMs: totalDuration,
    });
  } catch (error) {
    const duration = Date.now() - startedAt;
    console.error(`[recalculate-scores] Erreur après ${duration}ms :`, error);
    return NextResponse.json(
      { error: "Score recalculation failed" },
      { status: 500 }
    );
  }
}

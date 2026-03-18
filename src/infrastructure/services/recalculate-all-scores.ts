import { prisma } from "@/infrastructure/db/prisma";
import { excludeTestHostFilter } from "@/infrastructure/db/explorer-filters";
import {
  calculateCircleScore,
  calculateMomentScore,
} from "@/infrastructure/services/explorer-score.service";

export type RecalculateAllScoresResult = {
  circles: number;
  moments: number;
  durationMs: number;
};

/**
 * Batch de recalcul des scores Explorer pour l'ensemble des Communautés
 * (publiques ET privées) et leurs événements publics à venir.
 *
 * Les overrideScore sont respectés : calculateCircleScore les retourne
 * directement sans recalcul si non-null.
 *
 * Appelé par le cron quotidien (3h UTC) et par l'action admin manuelle.
 */
export async function recalculateAllScores(): Promise<RecalculateAllScoresResult> {
  const startedAt = Date.now();
  const now = new Date();

  // 1. Recalcul des scores Communautés
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

  // 2. Recalcul des scores événements
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

  return {
    circles: circles.length,
    moments: moments.length,
    durationMs: Date.now() - startedAt,
  };
}

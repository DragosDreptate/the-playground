import { prisma } from "@/infrastructure/db/prisma";
import {
  calculateCircleScore,
  calculateMomentScore,
} from "@/infrastructure/services/explorer-score.service";

/**
 * Recalcule immédiatement le score Explorer d'un Circle et de ses Moments
 * à venir. Appelé après chaque modification admin qui impacte l'affichage
 * (override de score, exclusion/visibilité).
 */
export async function recalculateCircleScore(circleId: string): Promise<void> {
  const now = new Date();

  const circle = await prisma.circle.findUniqueOrThrow({
    where: { id: circleId },
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
          memberships: { where: { role: "PLAYER", status: "ACTIVE" } },
        },
      },
      moments: {
        select: {
          id: true,
          status: true,
          startsAt: true,
          description: true,
          coverImage: true,
          locationName: true,
          _count: {
            select: {
              registrations: { where: { status: "REGISTERED" } },
            },
          },
        },
      },
    },
  });

  const pastMoments = circle.moments.filter((m) => m.status === "PAST");
  const hasPastEventWithRegistrant = pastMoments.some(
    (m) => m._count.registrations > 0
  );
  const pastEventCount = pastMoments.length;
  const hasUpcomingEvent = circle.moments.some(
    (m) => m.status === "PUBLISHED" && m.startsAt > now
  );

  const circleScore = calculateCircleScore({
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

  const upcomingMoments = circle.moments.filter(
    (m) => m.status === "PUBLISHED" && m.startsAt > now
  );

  await prisma.$transaction([
    prisma.circle.update({
      where: { id: circleId },
      data: { explorerScore: circleScore, scoreUpdatedAt: now },
    }),
    ...upcomingMoments.map((moment) => {
      const score = calculateMomentScore({
        description: moment.description,
        coverImage: moment.coverImage,
        locationName: moment.locationName,
        registrantCount: moment._count.registrations,
        circleScore,
        circleIsDemo: circle.isDemo,
      });
      return prisma.moment.update({
        where: { id: moment.id },
        data: { explorerScore: score },
      });
    }),
  ]);
}

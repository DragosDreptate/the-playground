"use server";

import {
  prismaCircleRepository,
  prismaMomentRepository,
  prismaRegistrationRepository,
} from "@/infrastructure/repositories";
import { auth } from "@/infrastructure/auth/auth.config";
import { getPublicCircles } from "@/domain/usecases/get-public-circles";
import { getPublicUpcomingMoments } from "@/domain/usecases/get-public-upcoming-moments";
import type { CircleCategory, CircleMemberRole } from "@/domain/models/circle";
import type { PublicCircle, ExplorerSortBy } from "@/domain/ports/repositories/circle-repository";
import type { PublicMoment } from "@/domain/ports/repositories/moment-repository";
import type { RegistrationStatus } from "@/domain/models/registration";

// Communautés : grille jusqu'à 4 colonnes (sm:2, md:3, lg:4). 12 = lignes
// complètes à chaque palier (multiple de 2, 3 et 4), jamais de ligne tronquée.
const CIRCLES_PAGE_SIZE = 12;
const CIRCLES_FETCH_SIZE = CIRCLES_PAGE_SIZE + 1;
// Événements : liste verticale à une colonne, pas de contrainte de grille.
const MOMENTS_PAGE_SIZE = 10;
const MOMENTS_FETCH_SIZE = MOMENTS_PAGE_SIZE + 1;

export async function loadMoreCirclesAction({
  offset,
  category,
  sortBy,
}: {
  offset: number;
  category?: CircleCategory;
  sortBy?: ExplorerSortBy;
}): Promise<{
  circles: PublicCircle[];
  hasMore: boolean;
  membershipRoleMap: Record<string, CircleMemberRole>;
}> {
  const session = await auth();

  const [fetched, userCircles] = await Promise.all([
    getPublicCircles(
      { category, sortBy, limit: CIRCLES_FETCH_SIZE, offset },
      { circleRepository: prismaCircleRepository }
    ),
    session?.user?.id
      ? prismaCircleRepository.findAllByUserId(session.user.id)
      : Promise.resolve([]),
  ]);

  const hasMore = fetched.length > CIRCLES_PAGE_SIZE;
  const circles = hasMore ? fetched.slice(0, CIRCLES_PAGE_SIZE) : fetched;

  const membershipRoleMap: Record<string, CircleMemberRole> = {};
  for (const c of userCircles) {
    membershipRoleMap[c.id] = c.memberRole;
  }

  return { circles, hasMore, membershipRoleMap };
}

export async function loadMoreMomentsAction({
  offset,
  category,
  sortBy,
}: {
  offset: number;
  category?: CircleCategory;
  sortBy?: ExplorerSortBy;
}): Promise<{
  moments: PublicMoment[];
  hasMore: boolean;
  registrationStatusMap: Record<string, RegistrationStatus | null>;
  membershipBySlug: Record<string, CircleMemberRole>;
}> {
  const session = await auth();

  const [fetched, userCircles] = await Promise.all([
    getPublicUpcomingMoments(
      { category, sortBy, limit: MOMENTS_FETCH_SIZE, offset },
      { momentRepository: prismaMomentRepository }
    ),
    session?.user?.id
      ? prismaCircleRepository.findAllByUserId(session.user.id)
      : Promise.resolve([]),
  ]);

  const hasMore = fetched.length > MOMENTS_PAGE_SIZE;
  const moments = hasMore ? fetched.slice(0, MOMENTS_PAGE_SIZE) : fetched;

  const registrationStatusMap: Record<string, RegistrationStatus | null> = {};
  if (session?.user?.id && moments.length > 0) {
    const regMap = await prismaRegistrationRepository.findByMomentIdsAndUser(
      moments.map((m) => m.id),
      session.user.id
    );
    for (const [momentId, reg] of regMap) {
      registrationStatusMap[momentId] = reg?.status ?? null;
    }
  }

  const membershipBySlug: Record<string, CircleMemberRole> = {};
  for (const c of userCircles) {
    membershipBySlug[c.slug] = c.memberRole;
  }

  return { moments, hasMore, registrationStatusMap, membershipBySlug };
}

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
import type { PublicCircle } from "@/domain/ports/repositories/circle-repository";
import type { PublicMoment } from "@/domain/ports/repositories/moment-repository";
import type { RegistrationStatus } from "@/domain/models/registration";

const PAGE_SIZE = 12;
const FETCH_SIZE = PAGE_SIZE + 1;

export async function loadMoreCirclesAction({
  offset,
  category,
}: {
  offset: number;
  category?: CircleCategory;
}): Promise<{
  circles: PublicCircle[];
  hasMore: boolean;
  membershipRoleMap: Record<string, CircleMemberRole>;
}> {
  const session = await auth();

  const [fetched, userCircles] = await Promise.all([
    getPublicCircles(
      { category, limit: FETCH_SIZE, offset },
      { circleRepository: prismaCircleRepository }
    ),
    session?.user?.id
      ? prismaCircleRepository.findAllByUserId(session.user.id)
      : Promise.resolve([]),
  ]);

  const hasMore = fetched.length > PAGE_SIZE;
  const circles = hasMore ? fetched.slice(0, PAGE_SIZE) : fetched;

  const membershipRoleMap: Record<string, CircleMemberRole> = {};
  for (const c of userCircles) {
    membershipRoleMap[c.id] = c.memberRole;
  }

  return { circles, hasMore, membershipRoleMap };
}

export async function loadMoreMomentsAction({
  offset,
  category,
}: {
  offset: number;
  category?: CircleCategory;
}): Promise<{
  moments: PublicMoment[];
  hasMore: boolean;
  registrationStatusMap: Record<string, RegistrationStatus | null>;
  membershipBySlug: Record<string, CircleMemberRole>;
}> {
  const session = await auth();

  const [fetched, userCircles] = await Promise.all([
    getPublicUpcomingMoments(
      { category, limit: FETCH_SIZE, offset },
      { momentRepository: prismaMomentRepository }
    ),
    session?.user?.id
      ? prismaCircleRepository.findAllByUserId(session.user.id)
      : Promise.resolve([]),
  ]);

  const hasMore = fetched.length > PAGE_SIZE;
  const moments = hasMore ? fetched.slice(0, PAGE_SIZE) : fetched;

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

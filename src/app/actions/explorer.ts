"use server";

import {
  prismaCircleRepository,
  prismaMomentRepository,
} from "@/infrastructure/repositories";
import { auth } from "@/infrastructure/auth/auth.config";
import { getPublicCircles } from "@/domain/usecases/get-public-circles";
import { getPublicUpcomingMoments } from "@/domain/usecases/get-public-upcoming-moments";
import type { CircleCategory, CircleMemberRole } from "@/domain/models/circle";
import type { PublicCircle, ExplorerSortBy } from "@/domain/ports/repositories/circle-repository";
import type { PublicMoment } from "@/domain/ports/repositories/moment-repository";

import {
  CIRCLES_PAGE_SIZE,
  CIRCLES_FETCH_SIZE,
  MOMENTS_PAGE_SIZE,
  MOMENTS_FETCH_SIZE,
} from "@/lib/explorer-pagination";

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
}> {
  const fetched = await getPublicUpcomingMoments(
    { category, sortBy, limit: MOMENTS_FETCH_SIZE, offset },
    { momentRepository: prismaMomentRepository }
  );

  const hasMore = fetched.length > MOMENTS_PAGE_SIZE;
  const moments = hasMore ? fetched.slice(0, MOMENTS_PAGE_SIZE) : fetched;

  return { moments, hasMore };
}

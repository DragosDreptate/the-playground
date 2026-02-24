import { prisma, Prisma } from "@/infrastructure/db/prisma";
import type {
  CircleRepository,
  CreateCircleInput,
  UpdateCircleInput,
  PublicCircleFilters,
  PublicCircle,
  CircleFollowerInfo,
} from "@/domain/ports/repositories/circle-repository";
import type { Circle, CircleMembership, CircleMemberRole, CircleMemberWithUser, CircleWithRole, CoverImageAttribution, CircleFollow, DashboardCircle } from "@/domain/models/circle";
import type { Circle as PrismaCircle, CircleMembership as PrismaMembership } from "@prisma/client";

function toDomainCircle(record: PrismaCircle): Circle {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    description: record.description,
    logo: record.logo,
    coverImage: record.coverImage ?? null,
    coverImageAttribution: record.coverImageAttribution
      ? (record.coverImageAttribution as CoverImageAttribution)
      : null,
    visibility: record.visibility,
    category: record.category ?? null,
    city: record.city ?? null,
    stripeConnectAccountId: record.stripeConnectAccountId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toDomainMembership(record: PrismaMembership): CircleMembership {
  return {
    id: record.id,
    userId: record.userId,
    circleId: record.circleId,
    role: record.role,
    joinedAt: record.joinedAt,
  };
}

export const prismaCircleRepository: CircleRepository = {
  async create(input: CreateCircleInput): Promise<Circle> {
    const record = await prisma.circle.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        visibility: input.visibility,
        ...(input.category !== undefined && { category: input.category }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.coverImage !== undefined && { coverImage: input.coverImage }),
        ...(input.coverImageAttribution !== undefined && {
          coverImageAttribution:
            input.coverImageAttribution === null
              ? Prisma.DbNull
              : input.coverImageAttribution,
        }),
      },
    });
    return toDomainCircle(record);
  },

  async findById(id: string): Promise<Circle | null> {
    const record = await prisma.circle.findUnique({ where: { id } });
    return record ? toDomainCircle(record) : null;
  },

  async findBySlug(slug: string): Promise<Circle | null> {
    const record = await prisma.circle.findUnique({ where: { slug } });
    return record ? toDomainCircle(record) : null;
  },

  async findByUserId(userId: string, role: CircleMemberRole): Promise<Circle[]> {
    const memberships = await prisma.circleMembership.findMany({
      where: { userId, role },
      include: { circle: true },
    });
    return memberships.map((m) => toDomainCircle(m.circle));
  },

  async update(id: string, input: UpdateCircleInput): Promise<Circle> {
    const record = await prisma.circle.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.visibility !== undefined && { visibility: input.visibility }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.coverImage !== undefined && { coverImage: input.coverImage }),
        ...(input.coverImageAttribution !== undefined && {
          coverImageAttribution:
            input.coverImageAttribution === null
              ? Prisma.DbNull
              : input.coverImageAttribution,
        }),
      },
    });
    return toDomainCircle(record);
  },

  async delete(id: string): Promise<void> {
    await prisma.circle.delete({ where: { id } });
  },

  async slugExists(slug: string): Promise<boolean> {
    const count = await prisma.circle.count({ where: { slug } });
    return count > 0;
  },

  async addMembership(
    circleId: string,
    userId: string,
    role: CircleMemberRole
  ): Promise<CircleMembership> {
    const record = await prisma.circleMembership.create({
      data: { circleId, userId, role },
    });
    return toDomainMembership(record);
  },

  async findAllByUserId(userId: string): Promise<CircleWithRole[]> {
    const memberships = await prisma.circleMembership.findMany({
      where: { userId },
      include: { circle: true },
      orderBy: { joinedAt: "desc" },
    });
    return memberships.map((m) => ({
      ...toDomainCircle(m.circle),
      memberRole: m.role,
    }));
  },

  async findAllByUserIdWithStats(userId: string): Promise<DashboardCircle[]> {
    const now = new Date();
    const memberships = await prisma.circleMembership.findMany({
      where: { userId },
      include: {
        circle: {
          include: {
            _count: { select: { memberships: true } },
            moments: {
              where: { status: "PUBLISHED", startsAt: { gte: now } },
              orderBy: { startsAt: "asc" },
              select: { title: true, startsAt: true },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });
    return memberships.map((m) => ({
      ...toDomainCircle(m.circle),
      memberRole: m.role,
      memberCount: m.circle._count.memberships,
      upcomingMomentCount: m.circle.moments.length,
      nextMoment: m.circle.moments[0] ?? null,
    }));
  },

  async findMembership(
    circleId: string,
    userId: string
  ): Promise<CircleMembership | null> {
    const record = await prisma.circleMembership.findUnique({
      where: {
        userId_circleId: { userId, circleId },
      },
    });
    return record ? toDomainMembership(record) : null;
  },

  async findMembersByRole(
    circleId: string,
    role: CircleMemberRole
  ): Promise<CircleMemberWithUser[]> {
    const records = await prisma.circleMembership.findMany({
      where: { circleId, role },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, image: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
    return records.map((r) => ({
      ...toDomainMembership(r),
      user: r.user,
    }));
  },

  async countMembers(circleId: string): Promise<number> {
    return prisma.circleMembership.count({ where: { circleId } });
  },

  async findMemberCountsByCircleIds(circleIds: string[]): Promise<Map<string, number>> {
    if (circleIds.length === 0) return new Map();
    // Requête GROUP BY : une seule requête pour N Circles (évite le N+1 du dashboard)
    const counts = await prisma.circleMembership.groupBy({
      by: ["circleId"],
      where: { circleId: { in: circleIds } },
      _count: { _all: true },
    });
    return new Map(counts.map((c) => [c.circleId, c._count._all]));
  },

  async findPublic(filters: PublicCircleFilters): Promise<PublicCircle[]> {
    const now = new Date();
    const circles = await prisma.circle.findMany({
      where: {
        visibility: "PUBLIC",
        ...(filters.category && { category: filters.category }),
      },
      include: {
        _count: { select: { memberships: true } },
        moments: {
          where: { status: "PUBLISHED", startsAt: { gte: now } },
          orderBy: { startsAt: "asc" },
          select: { title: true, startsAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: filters.limit ?? 20,
      skip: filters.offset ?? 0,
    });

    return circles.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      category: c.category ?? null,
      city: c.city ?? null,
      coverImage: c.coverImage ?? null,
      coverImageAttribution: c.coverImageAttribution
        ? (c.coverImageAttribution as CoverImageAttribution)
        : null,
      memberCount: c._count.memberships,
      upcomingMomentCount: c.moments.length,
      nextMoment: c.moments[0] ?? null,
    }));
  },

  async followCircle(userId: string, circleId: string): Promise<CircleFollow> {
    const row = await prisma.circleFollow.create({
      data: { userId, circleId },
    });
    return {
      id: row.id,
      userId: row.userId,
      circleId: row.circleId,
      createdAt: row.createdAt,
    };
  },

  async unfollowCircle(userId: string, circleId: string): Promise<void> {
    await prisma.circleFollow.delete({
      where: { userId_circleId: { userId, circleId } },
    });
  },

  async getFollowStatus(userId: string, circleId: string): Promise<boolean> {
    const row = await prisma.circleFollow.findUnique({
      where: { userId_circleId: { userId, circleId } },
    });
    return row !== null;
  },

  async findFollowers(circleId: string): Promise<CircleFollowerInfo[]> {
    const rows = await prisma.circleFollow.findMany({
      where: { circleId },
      include: {
        user: {
          select: { email: true, firstName: true, lastName: true },
        },
      },
    });
    return rows.map((r) => ({
      userId: r.userId,
      email: r.user.email,
      firstName: r.user.firstName,
      lastName: r.user.lastName,
    }));
  },

  async findPlayersForNewMomentNotification(
    circleId: string,
    excludeUserId: string
  ): Promise<CircleFollowerInfo[]> {
    const rows = await prisma.circleMembership.findMany({
      where: { circleId, userId: { not: excludeUserId } },
      include: {
        user: {
          select: { email: true, firstName: true, lastName: true },
        },
      },
    });
    return rows.map((r) => ({
      userId: r.userId,
      email: r.user.email,
      firstName: r.user.firstName,
      lastName: r.user.lastName,
    }));
  },
};

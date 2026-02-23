import { prisma } from "@/infrastructure/db/prisma";
import type {
  CircleRepository,
  CreateCircleInput,
  UpdateCircleInput,
  PublicCircleFilters,
  PublicCircle,
} from "@/domain/ports/repositories/circle-repository";
import type { Circle, CircleMembership, CircleMemberRole, CircleMemberWithUser, CircleWithRole } from "@/domain/models/circle";
import type { Circle as PrismaCircle, CircleMembership as PrismaMembership } from "@prisma/client";

function toDomainCircle(record: PrismaCircle): Circle {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    description: record.description,
    logo: record.logo,
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
      memberCount: c._count.memberships,
      upcomingMomentCount: c.moments.length,
      nextMoment: c.moments[0] ?? null,
    }));
  },
};

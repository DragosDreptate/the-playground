import { prisma, Prisma } from "@/infrastructure/db/prisma";
import { excludeTestHostFilter } from "@/infrastructure/db/explorer-filters";
import type {
  CircleRepository,
  CreateCircleInput,
  UpdateCircleInput,
  PublicCircleFilters,
  PublicCircle,
  CircleFollowerInfo,
  FeaturedCircle,
} from "@/domain/ports/repositories/circle-repository";
import { seededShuffle } from "@/lib/seeded-shuffle";
import type { Circle, CircleCategory, CircleMembership, CircleMemberRole, CircleMemberWithUser, CircleWithRole, CoverImageAttribution, DashboardCircle, MembershipStatus } from "@/domain/models/circle";
import type { PublicCircleMembership } from "@/domain/models/user";
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
    customCategory: record.customCategory ?? null,
    city: record.city ?? null,
    website: record.website ?? null,
    stripeConnectAccountId: record.stripeConnectAccountId,
    requiresApproval: record.requiresApproval,
    isDemo: record.isDemo,
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
    status: record.status,
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
        ...(input.customCategory !== undefined && { customCategory: input.customCategory }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.website !== undefined && { website: input.website }),
        ...(input.coverImage !== undefined && { coverImage: input.coverImage }),
        ...(input.coverImageAttribution !== undefined && {
          coverImageAttribution:
            input.coverImageAttribution === null
              ? Prisma.DbNull
              : input.coverImageAttribution,
        }),
        ...(input.requiresApproval !== undefined && { requiresApproval: input.requiresApproval }),
      },
    });
    return toDomainCircle(record);
  },

  async createWithHostMembership(
    input: CreateCircleInput,
    hostUserId: string
  ): Promise<Circle> {
    // Transaction atomique : Circle + CircleMembership HOST en une seule opération
    const record = await prisma.$transaction(async (tx) => {
      const circle = await tx.circle.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          visibility: input.visibility,
          ...(input.category !== undefined && { category: input.category }),
          ...(input.customCategory !== undefined && { customCategory: input.customCategory }),
          ...(input.city !== undefined && { city: input.city }),
          ...(input.website !== undefined && { website: input.website }),
          ...(input.coverImage !== undefined && { coverImage: input.coverImage }),
          ...(input.coverImageAttribution !== undefined && {
            coverImageAttribution:
              input.coverImageAttribution === null
                ? Prisma.DbNull
                : input.coverImageAttribution,
          }),
          ...(input.requiresApproval !== undefined && { requiresApproval: input.requiresApproval }),
        },
      });
      await tx.circleMembership.create({
        data: { circleId: circle.id, userId: hostUserId, role: "HOST" },
      });
      return circle;
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
      where: { userId, role, status: "ACTIVE" },
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
        ...(input.customCategory !== undefined && { customCategory: input.customCategory }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.website !== undefined && { website: input.website }),
        ...(input.coverImage !== undefined && { coverImage: input.coverImage }),
        ...(input.coverImageAttribution !== undefined && {
          coverImageAttribution:
            input.coverImageAttribution === null
              ? Prisma.DbNull
              : input.coverImageAttribution,
        }),
        ...(input.requiresApproval !== undefined && { requiresApproval: input.requiresApproval }),
        ...(input.stripeConnectAccountId !== undefined && { stripeConnectAccountId: input.stripeConnectAccountId }),
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
    role: CircleMemberRole,
    status: MembershipStatus = "ACTIVE"
  ): Promise<CircleMembership> {
    const record = await prisma.circleMembership.create({
      data: { circleId, userId, role, status },
    });
    return toDomainMembership(record);
  },

  async updateMembershipStatus(
    circleId: string,
    userId: string,
    status: MembershipStatus
  ): Promise<CircleMembership> {
    const record = await prisma.circleMembership.update({
      where: { userId_circleId: { userId, circleId } },
      data: { status },
    });
    return toDomainMembership(record);
  },

  async updateMembershipRole(
    circleId: string,
    userId: string,
    role: CircleMemberRole
  ): Promise<CircleMembership> {
    const record = await prisma.circleMembership.update({
      where: { userId_circleId: { userId, circleId } },
      data: { role },
    });
    return toDomainMembership(record);
  },

  async findPendingMemberships(circleId: string): Promise<CircleMemberWithUser[]> {
    const records = await prisma.circleMembership.findMany({
      where: { circleId, status: "PENDING" },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, image: true, publicId: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
    return records.map((r) => ({
      ...toDomainMembership(r),
      user: r.user,
    }));
  },

  async countPendingMemberships(circleId: string): Promise<number> {
    return prisma.circleMembership.count({ where: { circleId, status: "PENDING" } });
  },

  async findAllByUserId(userId: string): Promise<CircleWithRole[]> {
    const memberships = await prisma.circleMembership.findMany({
      where: { userId, status: "ACTIVE" },
      include: { circle: true },
      orderBy: { joinedAt: "desc" },
    });
    return memberships.map((m) => ({
      ...toDomainCircle(m.circle),
      memberRole: m.role,
    }));
  },

  async findAllByUserIdWithStats(userId: string): Promise<DashboardCircle[]> {
    // $queryRaw : 1 seul round-trip HTTP Neon au lieu de 3 (include Prisma = N requêtes séparées)
    // Les correlated subqueries s'appuient sur les index (circleId, status) existants
    type Row = {
      membershipId: string;
      role: CircleMemberRole;
      membershipStatus: MembershipStatus;
      joinedAt: Date;
      id: string;
      slug: string;
      name: string;
      description: string;
      logo: string | null;
      coverImage: string | null;
      coverImageAttribution: CoverImageAttribution | null;
      visibility: "PUBLIC" | "PRIVATE";
      category: string | null;
      customCategory: string | null;
      city: string | null;
      website: string | null;
      stripeConnectAccountId: string | null;
      requiresApproval: boolean;
      isDemo: boolean;
      createdAt: Date;
      updatedAt: Date;
      memberCount: number;
      upcomingMomentCount: number;
      nextMoment: { title: string; startsAt: string } | null;
      topMembers: { firstName: string | null; lastName: string | null; email: string; image: string | null }[];
    };

    const rows = await prisma.$queryRaw<Row[]>`
      SELECT
        cm.id                     AS "membershipId",
        cm.role                   AS "role",
        cm.status                 AS "membershipStatus",
        cm."joinedAt"             AS "joinedAt",
        c.id                      AS "id",
        c.slug                    AS "slug",
        c.name                    AS "name",
        c.description             AS "description",
        c.logo                    AS "logo",
        c."coverImage"            AS "coverImage",
        c."coverImageAttribution" AS "coverImageAttribution",
        c.visibility              AS "visibility",
        c.category                AS "category",
        c.custom_category         AS "customCategory",
        c.city                    AS "city",
        c.website                 AS "website",
        c."stripeConnectAccountId" AS "stripeConnectAccountId",
        c.requires_approval       AS "requiresApproval",
        c."isDemo"                AS "isDemo",
        c."createdAt"             AS "createdAt",
        c."updatedAt"             AS "updatedAt",
        (SELECT COUNT(*)::int FROM circle_memberships WHERE "circleId" = c.id AND status = 'ACTIVE')
          AS "memberCount",
        (SELECT COUNT(*)::int FROM moments
          WHERE "circleId" = c.id AND status = 'PUBLISHED' AND "startsAt" >= NOW())
          AS "upcomingMomentCount",
        (SELECT row_to_json(x) FROM (
          SELECT title, "startsAt"
          FROM moments
          WHERE "circleId" = c.id AND status = 'PUBLISHED' AND "startsAt" >= NOW()
          ORDER BY "startsAt" ASC
          LIMIT 1
        ) x) AS "nextMoment",
        (SELECT COALESCE(json_agg(sub), '[]'::json) FROM (
          SELECT u."firstName", u."lastName", u.email, u.image
          FROM circle_memberships cm2
          JOIN users u ON u.id = cm2."userId"
          WHERE cm2."circleId" = c.id AND cm2.status = 'ACTIVE'
          ORDER BY cm2."joinedAt" ASC
          LIMIT 3
        ) sub) AS "topMembers"
      FROM circle_memberships cm
      JOIN circles c ON c.id = cm."circleId"
      WHERE cm."userId" = ${userId} AND cm.status IN ('ACTIVE', 'PENDING')
      ORDER BY cm."joinedAt" DESC
    `;

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      logo: row.logo,
      coverImage: row.coverImage,
      coverImageAttribution: row.coverImageAttribution,
      visibility: row.visibility,
      category: (row.category as CircleCategory | null) ?? null,
      customCategory: row.customCategory,
      city: row.city,
      website: row.website,
      stripeConnectAccountId: row.stripeConnectAccountId,
      requiresApproval: row.requiresApproval ?? false,
      isDemo: row.isDemo ?? false,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      memberRole: row.role,
      membershipStatus: row.membershipStatus,
      memberCount: row.memberCount,
      upcomingMomentCount: row.upcomingMomentCount,
      topMembers: (row.topMembers ?? []).map((u) => ({ user: u })),
      nextMoment: row.nextMoment
        ? { title: row.nextMoment.title, startsAt: new Date(row.nextMoment.startsAt) }
        : null,
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
      where: { circleId, role, status: "ACTIVE" },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, image: true, publicId: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
    return records.map((r) => ({
      ...toDomainMembership(r),
      user: r.user,
    }));
  },

  async findOrganizers(circleId: string): Promise<CircleMemberWithUser[]> {
    const records = await prisma.circleMembership.findMany({
      where: { circleId, role: { in: ["HOST", "CO_HOST"] }, status: "ACTIVE" },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, image: true, publicId: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
    // Tri HOST > CO_HOST (par ordre d'arrivée dans chaque groupe)
    records.sort((a, b) => {
      if (a.role === b.role) return 0;
      return a.role === "HOST" ? -1 : 1;
    });
    return records.map((r) => ({
      ...toDomainMembership(r),
      user: r.user,
    }));
  },

  async countMembers(circleId: string): Promise<number> {
    return prisma.circleMembership.count({ where: { circleId, status: "ACTIVE" } });
  },

  async countMoments(circleId: string): Promise<number> {
    return prisma.moment.count({ where: { circleId } });
  },

  async findMemberCountsByCircleIds(circleIds: string[]): Promise<Map<string, number>> {
    if (circleIds.length === 0) return new Map();
    // Requête GROUP BY : une seule requête pour N Circles (évite le N+1 du dashboard)
    const counts = await prisma.circleMembership.groupBy({
      by: ["circleId"],
      where: { circleId: { in: circleIds }, status: "ACTIVE" },
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
        // Exclure les circles admin-exclus
        excludedFromExplorer: false,
        // Exclure les circles dont le host est un compte de test
        NOT: excludeTestHostFilter(),
        // Seuil d'affichage : ≥1 membre (HOST ou PLAYER) OU ≥1 event publié à venir
        // Note : HOST est inclus pour que les communautés nouvellement créées soient visibles
        // dès la création, avant que des Participants aient rejoint.
        OR: [
          {
            memberships: {
              some: { role: { in: ["HOST", "PLAYER"] }, status: "ACTIVE" },
            },
          },
          {
            moments: {
              some: {
                status: "PUBLISHED",
                startsAt: { gte: now },
              },
            },
          },
        ],
      },
      include: {
        // Comptes SQL précis — aucun enregistrement Moment chargé en mémoire pour le count
        _count: {
          select: {
            memberships: { where: { status: "ACTIVE" } },
            moments: {
              where: { status: "PUBLISHED", startsAt: { gte: now } },
            },
          },
        },
        // Un seul Moment chargé — uniquement les 2 champs nécessaires pour nextMoment
        moments: {
          where: { status: "PUBLISHED", startsAt: { gte: now } },
          orderBy: { startsAt: "asc" },
          take: 1,
          select: { title: true, startsAt: true },
        },
        // 3 premiers membres pour l'avatar stack
        memberships: {
          where: { status: "ACTIVE" },
          orderBy: { joinedAt: "asc" },
          take: 3,
          select: { user: { select: { firstName: true, lastName: true, email: true, image: true } } },
        },
      },
      orderBy:
        filters.sortBy === "date"
          ? { createdAt: "desc" }
          : filters.sortBy === "members"
            ? [{ memberships: { _count: "desc" } }, { explorerScore: "desc" }]
            : [{ explorerScore: "desc" }, { createdAt: "desc" }],
      take: filters.limit ?? 20,
      skip: filters.offset ?? 0,
    });

    return circles.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      category: c.category ?? null,
      customCategory: c.customCategory ?? null,
      city: c.city ?? null,
      coverImage: c.coverImage ?? null,
      coverImageAttribution: c.coverImageAttribution
        ? (c.coverImageAttribution as CoverImageAttribution)
        : null,
      memberCount: c._count.memberships,
      // upcomingMomentCount issu du _count SQL, pas de moments.length
      upcomingMomentCount: c._count.moments,
      topMembers: c.memberships.map((m) => ({ user: m.user })),
      nextMoment: c.moments[0] ?? null,
      isDemo: c.isDemo,
      explorerScore: c.explorerScore,
    }));
  },

  async removeMembership(circleId: string, userId: string): Promise<void> {
    await prisma.circleMembership.delete({
      where: { userId_circleId: { userId, circleId } },
    });
  },

  async findPlayersForNewMomentNotification(
    circleId: string,
    excludeUserId: string
  ): Promise<CircleFollowerInfo[]> {
    const rows = await prisma.circleMembership.findMany({
      where: { circleId, userId: { not: excludeUserId }, status: "ACTIVE", user: { role: { not: "ADMIN" } } },
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

  async findFeatured(): Promise<FeaturedCircle[]> {
    const featuredWhere = {
      visibility: "PUBLIC" as const,
      coverImage: { not: null as null },
      excludedFromExplorer: false,
      isDemo: false,
      NOT: excludeTestHostFilter(),
    };

    // Charger uniquement les IDs pour le shuffle (évite de lire toutes les colonnes)
    const rows = await prisma.circle.findMany({
      where: featuredWhere,
      select: { id: true },
    });

    if (rows.length === 0) return [];

    // Seed = date du jour (YYYY-MM-DD) → sélection stable sur 24h
    const today = new Date().toISOString().slice(0, 10);
    const selectedIds = seededShuffle(rows, today).slice(0, 3).map((r) => r.id);

    // Charger uniquement les 3 circles sélectionnés avec toutes leurs colonnes
    const now = new Date();
    const circles = await prisma.circle.findMany({
      where: { id: { in: selectedIds } },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        customCategory: true,
        city: true,
        coverImage: true,
        coverImageAttribution: true,
        _count: {
          select: {
            memberships: { where: { status: "ACTIVE" } },
            moments: {
              where: { status: "PUBLISHED", startsAt: { gte: now } },
            },
          },
        },
        memberships: {
          where: { status: "ACTIVE" },
          orderBy: { joinedAt: "asc" },
          take: 3,
          select: { user: { select: { firstName: true, lastName: true, email: true, image: true } } },
        },
      },
    });

    // Conserver l'ordre du shuffle (WHERE id IN ne garantit pas l'ordre)
    const byId = new Map(circles.map((c) => [c.id, c]));

    return selectedIds.flatMap((id) => {
      const c = byId.get(id);
      if (!c) return [];
      return [{
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        category: c.category ?? null,
        customCategory: c.customCategory ?? null,
        city: c.city ?? null,
        coverImage: c.coverImage!, // non-null garanti par le WHERE
        coverImageAttribution: c.coverImageAttribution as CoverImageAttribution | null,
        memberCount: c._count.memberships,
        upcomingMomentCount: c._count.moments,
        topMembers: c.memberships.map((m) => ({ user: m.user })),
      }];
    });
  },

  async getPublicCirclesForUser(userId: string): Promise<PublicCircleMembership[]> {
    const memberships = await prisma.circleMembership.findMany({
      where: { userId, status: "ACTIVE", circle: { visibility: "PUBLIC" } },
      include: {
        circle: {
          select: {
            slug: true,
            name: true,
            coverImage: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    // Tri : HOST d'abord, puis CO_HOST, puis PLAYER — alpha dans chaque groupe
    const roleOrder: Record<string, number> = { HOST: 0, CO_HOST: 1, PLAYER: 2 };
    memberships.sort((a, b) => {
      if (a.role !== b.role) return roleOrder[a.role] - roleOrder[b.role];
      return a.circle.name.localeCompare(b.circle.name);
    });

    return memberships.map((m) => ({
      circleSlug: m.circle.slug,
      circleName: m.circle.name,
      circleCover: m.circle.coverImage,
      role: m.role,
    }));
  },
};

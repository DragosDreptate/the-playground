import { prisma } from "@/infrastructure/db/prisma";
import type {
  AdminRepository,
  AdminStats,
  AdminTimeSeries,
  AdminTimeSeriesPoint,
  AdminActivationStats,
  AdminUserFilters,
  AdminUserRow,
  AdminUserDetail,
  AdminCircleFilters,
  AdminCircleRow,
  AdminCircleDetail,
  AdminExplorerFilters,
  AdminExplorerCircleRow,
  AdminExplorerMomentFilters,
  AdminExplorerMomentRow,
  AdminMomentFilters,
  AdminMomentRow,
  AdminMomentDetail,
  AdminInsightRegistration,
  AdminInsightFollower,
  AdminInsightComment,
} from "@/domain/ports/repositories/admin-repository";
import type { MomentStatus } from "@/domain/models/moment";
import { Prisma } from "@prisma/client";

const DEFAULT_LIMIT = 20;

// ─────────────────────────────────────────────
// Exclusion users démo/test
// ─────────────────────────────────────────────

const DEMO_EMAIL_SUFFIXES = ["@demo.playground", "@test.playground"] as const;

function realUserWhere(): Prisma.UserWhereInput {
  return {
    NOT: DEMO_EMAIL_SUFFIXES.map((suffix) => ({ email: { endsWith: suffix } })),
  };
}

function realCircleWhere(): Prisma.CircleWhereInput {
  return {
    memberships: { some: { role: "HOST", user: realUserWhere() } },
  };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function sevenDaysAgo(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

function userWhere(filters: AdminUserFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = realUserWhere();
  if (filters.role) where.role = filters.role;
  if (filters.since) where.createdAt = { gte: filters.since };
  if (filters.search) {
    where.OR = [
      { email: { contains: filters.search, mode: "insensitive" } },
      { firstName: { contains: filters.search, mode: "insensitive" } },
      { lastName: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  return where;
}

function circleWhere(filters: AdminCircleFilters): Prisma.CircleWhereInput {
  const where: Prisma.CircleWhereInput = realCircleWhere();
  if (filters.visibility) where.visibility = filters.visibility;
  if (filters.category) where.category = filters.category;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { slug: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  return where;
}

function momentWhere(filters: AdminMomentFilters): Prisma.MomentWhereInput {
  const where: Prisma.MomentWhereInput = { circle: realCircleWhere() };
  if (filters.status) where.status = filters.status;
  if (filters.since) where.createdAt = { gte: filters.since };
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { slug: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  return where;
}

// ─────────────────────────────────────────────
// Sort helpers
// ─────────────────────────────────────────────

function dir(sortOrder?: string): "asc" | "desc" {
  return sortOrder === "asc" ? "asc" : "desc";
}

function userOrderBy(sortBy?: string, sortOrder?: string): Prisma.UserOrderByWithRelationInput {
  const d = dir(sortOrder);
  switch (sortBy) {
    case "name": return { firstName: d };
    case "email": return { email: d };
    case "role": return { role: d };
    case "circleCount": return { memberships: { _count: d } };
    case "momentCount": return { registrations: { _count: d } };
    case "createdAt": return { createdAt: d };
    default: return { createdAt: "desc" };
  }
}

function circleOrderBy(sortBy?: string, sortOrder?: string): Prisma.CircleOrderByWithRelationInput {
  const d = dir(sortOrder);
  switch (sortBy) {
    case "name": return { name: d };
    case "memberCount": return { memberships: { _count: d } };
    case "momentCount": return { moments: { _count: d } };
    case "visibility": return { visibility: d };
    case "category": return { category: d };
    case "createdAt": return { createdAt: d };
    default: return { createdAt: "desc" };
  }
}

function momentOrderBy(sortBy?: string, sortOrder?: string): Prisma.MomentOrderByWithRelationInput {
  const d = dir(sortOrder);
  switch (sortBy) {
    case "title": return { title: d };
    case "circleName": return { circle: { name: d } };
    case "startsAt": return { startsAt: d };
    case "status": return { status: d };
    case "registrationCount": return { registrations: { _count: d } };
    case "commentCount": return { comments: { _count: d } };
    case "createdAt": return { createdAt: d };
    default: return { createdAt: "desc" };
  }
}

function registrationOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.RegistrationOrderByWithRelationInput {
  const d = dir(sortOrder);
  switch (sortBy) {
    case "userName": return { user: { firstName: d } };
    case "userEmail": return { user: { email: d } };
    case "momentTitle": return { moment: { title: d } };
    case "circleName": return { moment: { circle: { name: d } } };
    case "registeredAt": return { registeredAt: d };
    default: return { registeredAt: "desc" };
  }
}

function commentOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.CommentOrderByWithRelationInput {
  const d = dir(sortOrder);
  switch (sortBy) {
    case "userName": return { user: { firstName: d } };
    case "userEmail": return { user: { email: d } };
    case "momentTitle": return { moment: { title: d } };
    case "circleName": return { moment: { circle: { name: d } } };
    case "createdAt": return { createdAt: d };
    default: return { createdAt: "desc" };
  }
}

function explorerCircleWhere(filters: AdminExplorerFilters): Prisma.CircleWhereInput {
  const where: Prisma.CircleWhereInput = { visibility: "PUBLIC" };
  if (filters.filter === "excluded") where.excludedFromExplorer = true;
  if (filters.filter === "boosted") where.overrideScore = { not: null };
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { slug: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  return where;
}

function explorerOrderBy(sortBy?: string, sortOrder?: string): Prisma.CircleOrderByWithRelationInput {
  const d = dir(sortOrder);
  switch (sortBy) {
    case "name": return { name: d };
    case "explorerScore": return { explorerScore: d };
    case "memberCount": return { memberships: { _count: d } };
    case "momentCount": return { moments: { _count: d } };
    default: return { explorerScore: "desc" };
  }
}

function followerOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.CircleMembershipOrderByWithRelationInput {
  const d = dir(sortOrder);
  switch (sortBy) {
    case "userName": return { user: { firstName: d } };
    case "userEmail": return { user: { email: d } };
    case "circleName": return { circle: { name: d } };
    case "joinedAt": return { joinedAt: d };
    default: return { joinedAt: "desc" };
  }
}

// Whitelist pour le tri raw SQL (activation once/retained)
const ACTIVATION_SQL_SORT: Record<string, string> = {
  name: 'u."firstName"',
  email: "u.email",
  registrationCount: 'COUNT(DISTINCT r."momentId")',
  createdAt: 'u."createdAt"',
};

// ─────────────────────────────────────────────
// Time series helpers
// ─────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fillDays(
  rows: Array<{ date: Date; count: bigint }>,
  days: number
): AdminTimeSeriesPoint[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 10);
    map.set(key, Number(row.count));
  }

  const result: AdminTimeSeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: map.get(key) ?? 0 });
  }
  return result;
}

// ─────────────────────────────────────────────
// Implementation
// ─────────────────────────────────────────────

export const prismaAdminRepository: AdminRepository = {
  // ── Stats ────────────────────────────────

  async getStats(): Promise<AdminStats> {
    const since = sevenDaysAgo();
    const realUser = realUserWhere();
    const realCircle = realCircleWhere();
    const realMembership: Prisma.CircleMembershipWhereInput = {
      role: "PLAYER",
      user: realUser,
      circle: realCircle,
    };
    const [
      totalUsers,
      totalCircles,
      totalMoments,
      totalRegistrations,
      totalComments,
      totalFollowers,
      recentUsers,
      recentCircles,
      recentMoments,
      recentComments,
      recentFollowers,
    ] = await Promise.all([
      prisma.user.count({ where: realUser }),
      prisma.circle.count({ where: realCircle }),
      prisma.moment.count({ where: { circle: realCircle } }),
      prisma.registration.count({ where: { status: { not: "CANCELLED" }, user: realUser } }),
      prisma.comment.count({ where: { user: realUser } }),
      prisma.circleMembership.count({ where: realMembership }),
      prisma.user.count({ where: { ...realUser, createdAt: { gte: since } } }),
      prisma.circle.count({ where: { ...realCircle, createdAt: { gte: since } } }),
      prisma.moment.count({ where: { circle: realCircle, createdAt: { gte: since } } }),
      prisma.comment.count({ where: { user: realUser, createdAt: { gte: since } } }),
      prisma.circleMembership.count({ where: { ...realMembership, joinedAt: { gte: since } } }),
    ]);
    return {
      totalUsers,
      totalCircles,
      totalMoments,
      totalRegistrations,
      totalComments,
      totalFollowers,
      recentUsers,
      recentCircles,
      recentMoments,
      recentComments,
      recentFollowers,
    };
  },

  async getTimeSeries(days: number): Promise<AdminTimeSeries> {
    const since = daysAgo(days);
    const [userRows, registrationRows, momentRows] = await Promise.all([
      prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE_TRUNC('day', "createdAt")::date AS date, COUNT(*)::bigint AS count
        FROM users
        WHERE "createdAt" >= ${since}
          AND email NOT LIKE '%@demo.playground'
          AND email NOT LIKE '%@test.playground'
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY date ASC
      `,
      prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE_TRUNC('day', r."registeredAt")::date AS date, COUNT(*)::bigint AS count
        FROM registrations r
        JOIN users u ON u.id = r."userId"
        WHERE r.status != 'CANCELLED'
          AND r."registeredAt" >= ${since}
          AND u.email NOT LIKE '%@demo.playground'
          AND u.email NOT LIKE '%@test.playground'
        GROUP BY DATE_TRUNC('day', r."registeredAt")
        ORDER BY date ASC
      `,
      prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE_TRUNC('day', m."createdAt")::date AS date, COUNT(*)::bigint AS count
        FROM moments m
        WHERE m."createdAt" >= ${since}
          AND m."createdById" IN (
            SELECT id FROM users
            WHERE email NOT LIKE '%@demo.playground'
              AND email NOT LIKE '%@test.playground'
          )
        GROUP BY DATE_TRUNC('day', m."createdAt")
        ORDER BY date ASC
      `,
    ]);
    return {
      users: fillDays(userRows, days),
      registrations: fillDays(registrationRows, days),
      moments: fillDays(momentRows, days),
    };
  },

  async getActivationStats(): Promise<AdminActivationStats> {
    const [totalUsers, activatedRows, retainedRows] = await Promise.all([
      prisma.user.count({ where: realUserWhere() }),
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT r."userId")::bigint AS count
        FROM registrations r
        JOIN users u ON u.id = r."userId"
        WHERE r.status != 'CANCELLED'
          AND u.email NOT LIKE '%@demo.playground'
          AND u.email NOT LIKE '%@test.playground'
      `,
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM (
          SELECT r."userId"
          FROM registrations r
          JOIN users u ON u.id = r."userId"
          WHERE r.status != 'CANCELLED'
            AND u.email NOT LIKE '%@demo.playground'
            AND u.email NOT LIKE '%@test.playground'
          GROUP BY r."userId"
          HAVING COUNT(DISTINCT r."momentId") >= 2
        ) sub
      `,
    ]);
    const activatedUsers = Number(activatedRows[0]?.count ?? 0);
    const retainedUsers = Number(retainedRows[0]?.count ?? 0);
    return {
      totalUsers,
      activatedUsers,
      retainedUsers,
      activationRate: totalUsers > 0 ? Math.round((activatedUsers / totalUsers) * 100) : 0,
      retentionRate: totalUsers > 0 ? Math.round((retainedUsers / totalUsers) * 100) : 0,
    };
  },

  // ── Users ────────────────────────────────

  async findAllUsers(filters: AdminUserFilters): Promise<AdminUserRow[]> {
    const records = await prisma.user.findMany({
      where: userWhere(filters),
      include: {
        _count: { select: { memberships: true, registrations: true } },
      },
      orderBy: userOrderBy(filters.sortBy, filters.sortOrder),
      take: filters.limit ?? DEFAULT_LIMIT,
      skip: filters.offset ?? 0,
    });
    return records.map((r) => ({
      id: r.id,
      email: r.email,
      firstName: r.firstName,
      lastName: r.lastName,
      role: r.role,
      circleCount: r._count.memberships,
      momentCount: r._count.registrations,
      createdAt: r.createdAt,
    }));
  },

  async countUsers(filters: AdminUserFilters): Promise<number> {
    return prisma.user.count({ where: userWhere(filters) });
  },

  async findUserById(id: string): Promise<AdminUserDetail | null> {
    const record = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: { select: { memberships: true, registrations: true } },
        memberships: {
          include: { circle: { select: { id: true, name: true, slug: true } } },
        },
      },
    });
    if (!record) return null;
    return {
      id: record.id,
      email: record.email,
      firstName: record.firstName,
      lastName: record.lastName,
      name: record.name,
      image: record.image,
      role: record.role,
      onboardingCompleted: record.onboardingCompleted,
      circleCount: record._count.memberships,
      momentCount: record._count.registrations,
      registrationCount: record._count.registrations,
      createdAt: record.createdAt,
      circles: record.memberships.map((m) => ({
        id: m.circle.id,
        name: m.circle.name,
        slug: m.circle.slug,
        role: m.role,
      })),
    };
  },

  async deleteUser(id: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 1. Find Circles where this user is HOST
      const hostMemberships = await tx.circleMembership.findMany({
        where: { userId: id, role: "HOST" },
        select: { circleId: true },
      });

      if (hostMemberships.length > 0) {
        const circleIds = hostMemberships.map((m) => m.circleId);

        // Une seule requête GROUP BY pour compter les autres Hosts (évite le N+1)
        const otherHostCounts = await tx.circleMembership.groupBy({
          by: ["circleId"],
          where: { circleId: { in: circleIds }, role: "HOST", userId: { not: id } },
          _count: { _all: true },
        });
        const otherHostCountMap = new Map(
          otherHostCounts.map((r) => [r.circleId, r._count._all])
        );

        // Supprimer uniquement les Circles sans autre Host
        const circlesWithNoOtherHost = circleIds.filter(
          (cid) => (otherHostCountMap.get(cid) ?? 0) === 0
        );
        if (circlesWithNoOtherHost.length > 0) {
          await tx.circle.deleteMany({
            where: { id: { in: circlesWithNoOtherHost } },
          });
        }
      }

      // 2. Delete the user (cascades to remaining memberships, registrations, comments, accounts, sessions)
      await tx.user.delete({ where: { id } });
    });
  },

  // ── Circles ──────────────────────────────

  async findAllCircles(filters: AdminCircleFilters): Promise<AdminCircleRow[]> {
    const records = await prisma.circle.findMany({
      where: circleWhere(filters),
      include: {
        _count: { select: { memberships: true, moments: true } },
        memberships: {
          where: { role: "HOST" },
          take: 1,
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
      },
      orderBy: circleOrderBy(filters.sortBy, filters.sortOrder),
      take: filters.limit ?? DEFAULT_LIMIT,
      skip: filters.offset ?? 0,
    });
    return records.map((r) => {
      const host = r.memberships[0]?.user;
      const hostName = host
        ? [host.firstName, host.lastName].filter(Boolean).join(" ") || host.email
        : "—";
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        visibility: r.visibility,
        category: r.category,
        city: r.city,
        memberCount: r._count.memberships,
        momentCount: r._count.moments,
        hostName,
        createdAt: r.createdAt,
      };
    });
  },

  async countCircles(filters: AdminCircleFilters): Promise<number> {
    return prisma.circle.count({ where: circleWhere(filters) });
  },

  async findCircleById(id: string): Promise<AdminCircleDetail | null> {
    const record = await prisma.circle.findUnique({
      where: { id },
      include: {
        _count: { select: { memberships: true, moments: true } },
        memberships: {
          where: { role: "HOST" },
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
        moments: {
          orderBy: { startsAt: "desc" },
          take: 10,
          select: { id: true, title: true, slug: true, status: true, startsAt: true },
        },
      },
    });
    if (!record) return null;
    const firstHost = record.memberships[0]?.user;
    const hostName = firstHost
      ? [firstHost.firstName, firstHost.lastName].filter(Boolean).join(" ") || firstHost.email
      : "—";
    return {
      id: record.id,
      slug: record.slug,
      name: record.name,
      description: record.description,
      visibility: record.visibility,
      category: record.category,
      city: record.city,
      memberCount: record._count.memberships,
      momentCount: record._count.moments,
      hostName,
      createdAt: record.createdAt,
      hosts: record.memberships.map((m) => m.user),
      recentMoments: record.moments,
      isDemo: record.isDemo,
      explorerScore: record.explorerScore,
      overrideScore: record.overrideScore,
      excludedFromExplorer: record.excludedFromExplorer,
      scoreUpdatedAt: record.scoreUpdatedAt,
    };
  },

  async deleteCircle(id: string): Promise<void> {
    await prisma.circle.delete({ where: { id } });
  },

  // ── Explorer ──────────────────────────────

  async findAllExplorerCircles(filters: AdminExplorerFilters): Promise<AdminExplorerCircleRow[]> {
    const records = await prisma.circle.findMany({
      where: explorerCircleWhere(filters),
      include: {
        _count: { select: { memberships: { where: { role: "PLAYER" } }, moments: true } },
        memberships: {
          where: { role: "HOST" },
          take: 1,
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
      },
      orderBy: explorerOrderBy(filters.sortBy, filters.sortOrder),
      take: filters.limit ?? DEFAULT_LIMIT,
      skip: filters.offset ?? 0,
    });
    return records.map((r) => {
      const host = r.memberships[0]?.user;
      const hostName = host
        ? [host.firstName, host.lastName].filter(Boolean).join(" ") || host.email
        : "—";
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        isDemo: r.isDemo,
        explorerScore: r.explorerScore,
        overrideScore: r.overrideScore,
        excludedFromExplorer: r.excludedFromExplorer,
        scoreUpdatedAt: r.scoreUpdatedAt,
        memberCount: r._count.memberships,
        momentCount: r._count.moments,
        hostName,
      };
    });
  },

  async countExplorerCircles(filters: AdminExplorerFilters): Promise<number> {
    return prisma.circle.count({ where: explorerCircleWhere(filters) });
  },

  async updateCircleExcluded(id: string, excluded: boolean): Promise<void> {
    await prisma.circle.update({ where: { id }, data: { excludedFromExplorer: excluded } });
  },

  async updateCircleOverrideScore(id: string, score: number | null): Promise<void> {
    await prisma.circle.update({ where: { id }, data: { overrideScore: score } });
  },

  async findAllExplorerMoments(filters: AdminExplorerMomentFilters): Promise<AdminExplorerMomentRow[]> {
    const where: Prisma.MomentWhereInput = { circle: { visibility: "PUBLIC" } };
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { circle: { name: { contains: filters.search, mode: "insensitive" } } },
      ];
    }
    const d = filters.sortOrder ?? "desc";
    const orderBy = (() => {
      switch (filters.sortBy) {
        case "title": return { title: d } as Prisma.MomentOrderByWithRelationInput;
        case "circleName": return { circle: { name: d } } as Prisma.MomentOrderByWithRelationInput;
        case "startsAt": return { startsAt: d } as Prisma.MomentOrderByWithRelationInput;
        case "registrationCount": return { registrations: { _count: d } } as Prisma.MomentOrderByWithRelationInput;
        case "explorerScore": return { explorerScore: d } as Prisma.MomentOrderByWithRelationInput;
        default: return { explorerScore: "desc" } as Prisma.MomentOrderByWithRelationInput;
      }
    })();
    const records = await prisma.moment.findMany({
      where,
      include: {
        circle: { select: { name: true, slug: true, isDemo: true } },
        _count: { select: { registrations: true } },
      },
      orderBy,
      take: filters.limit ?? DEFAULT_LIMIT,
      skip: filters.offset ?? 0,
    });
    return records.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      circleName: r.circle.name,
      circleSlug: r.circle.slug,
      isDemo: r.circle.isDemo,
      explorerScore: r.explorerScore,
      startsAt: r.startsAt,
      registrationCount: r._count.registrations,
    }));
  },

  async countExplorerMoments(filters: AdminExplorerMomentFilters): Promise<number> {
    const where: Prisma.MomentWhereInput = { circle: { visibility: "PUBLIC" } };
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { circle: { name: { contains: filters.search, mode: "insensitive" } } },
      ];
    }
    return prisma.moment.count({ where });
  },

  // ── Moments ──────────────────────────────

  async findAllMoments(filters: AdminMomentFilters): Promise<AdminMomentRow[]> {
    const records = await prisma.moment.findMany({
      where: momentWhere(filters),
      include: {
        circle: { select: { name: true } },
        _count: { select: { registrations: true, comments: true } },
      },
      orderBy: momentOrderBy(filters.sortBy, filters.sortOrder),
      take: filters.limit ?? DEFAULT_LIMIT,
      skip: filters.offset ?? 0,
    });
    return records.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      status: r.status,
      circleName: r.circle.name,
      registrationCount: r._count.registrations,
      commentCount: r._count.comments,
      capacity: r.capacity,
      startsAt: r.startsAt,
      createdAt: r.createdAt,
    }));
  },

  async countMoments(filters: AdminMomentFilters): Promise<number> {
    return prisma.moment.count({ where: momentWhere(filters) });
  },

  async findMomentById(id: string): Promise<AdminMomentDetail | null> {
    const record = await prisma.moment.findUnique({
      where: { id },
      include: {
        circle: { select: { name: true, slug: true } },
        createdBy: { select: { email: true, firstName: true, lastName: true } },
        _count: { select: { comments: true } },
        registrations: {
          select: {
            id: true,
            status: true,
            registeredAt: true,
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
          orderBy: { registeredAt: "desc" },
          // Limite de sécurité pour les pages admin — un Moment avec +1000 inscrits resterait gérable
          take: 500,
        },
      },
    });
    if (!record) return null;
    return {
      id: record.id,
      slug: record.slug,
      title: record.title,
      description: record.description,
      status: record.status,
      circleName: record.circle.name,
      circleId: record.circle.slug, // used for links
      circleSlug: record.circle.slug,
      registrationCount: record.registrations.length,
      commentCount: record._count.comments,
      capacity: record.capacity,
      startsAt: record.startsAt,
      createdAt: record.createdAt,
      createdByEmail: record.createdBy?.email ?? null,
      createdByName: record.createdBy
        ? [record.createdBy.firstName, record.createdBy.lastName]
            .filter(Boolean)
            .join(" ") || null
        : null,
      registrations: record.registrations.map((reg) => ({
        id: reg.id,
        userId: reg.user.id,
        userEmail: reg.user.email,
        userName: [reg.user.firstName, reg.user.lastName].filter(Boolean).join(" ") || null,
        status: reg.status,
        registeredAt: reg.registeredAt,
      })),
    };
  },

  async deleteMoment(id: string): Promise<void> {
    await prisma.moment.delete({ where: { id } });
  },

  async updateMomentStatus(id: string, status: MomentStatus): Promise<void> {
    await prisma.moment.update({ where: { id }, data: { status } });
  },

  // ── Insights ─────────────────────────────

  async getRegistrationsInsight(
    days: number,
    limit: number,
    offset: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<{ registrations: AdminInsightRegistration[]; total: number }> {
    const since = daysAgo(days);
    const userFilter = realUserWhere();
    const [registrations, total] = await Promise.all([
      prisma.registration.findMany({
        where: {
          registeredAt: { gte: since },
          status: { not: "CANCELLED" },
          user: userFilter,
        },
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
          moment: {
            select: { title: true, slug: true, circle: { select: { name: true } } },
          },
        },
        orderBy: registrationOrderBy(sortBy, sortOrder),
        take: limit,
        skip: offset,
      }),
      prisma.registration.count({
        where: {
          registeredAt: { gte: since },
          status: { not: "CANCELLED" },
          user: userFilter,
        },
      }),
    ]);
    return {
      registrations: registrations.map((r) => ({
        id: r.id,
        userId: r.userId,
        userEmail: r.user.email,
        userName: [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") || null,
        momentTitle: r.moment.title,
        momentSlug: r.moment.slug,
        circleName: r.moment.circle.name,
        status: r.status,
        registeredAt: r.registeredAt,
      })),
      total,
    };
  },

  async getCommentsInsight(
    days: number,
    limit: number,
    offset: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<{ comments: AdminInsightComment[]; total: number }> {
    const since = daysAgo(days);
    const userFilter = realUserWhere();
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { createdAt: { gte: since }, user: userFilter },
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
          moment: { select: { title: true, slug: true, circle: { select: { name: true } } } },
        },
        orderBy: commentOrderBy(sortBy, sortOrder),
        take: limit,
        skip: offset,
      }),
      prisma.comment.count({
        where: { createdAt: { gte: since }, user: userFilter },
      }),
    ]);
    return {
      comments: comments.map((c) => ({
        id: c.id,
        userId: c.userId,
        userEmail: c.user.email,
        userName: [c.user.firstName, c.user.lastName].filter(Boolean).join(" ") || null,
        content: c.content,
        momentTitle: c.moment.title,
        momentSlug: c.moment.slug,
        circleName: c.moment.circle.name,
        createdAt: c.createdAt,
      })),
      total,
    };
  },

  async getFollowersInsight(
    days: number,
    limit: number,
    offset: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<{ followers: AdminInsightFollower[]; total: number }> {
    const since = daysAgo(days);
    const where: Prisma.CircleMembershipWhereInput = {
      role: "PLAYER",
      joinedAt: { gte: since },
      user: realUserWhere(),
      circle: realCircleWhere(),
    };
    const [memberships, total] = await Promise.all([
      prisma.circleMembership.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          circle: { select: { id: true, name: true, slug: true } },
        },
        orderBy: followerOrderBy(sortBy, sortOrder),
        take: limit,
        skip: offset,
      }),
      prisma.circleMembership.count({ where }),
    ]);
    return {
      followers: memberships.map((m) => ({
        id: m.id,
        userId: m.userId,
        userEmail: m.user.email,
        userName: [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") || null,
        circleId: m.circle.id,
        circleName: m.circle.name,
        circleSlug: m.circle.slug,
        joinedAt: m.joinedAt,
      })),
      total,
    };
  },

  async getUsersByActivation(
    segment: "never" | "once" | "retained",
    limit: number,
    offset: number,
    sortBy?: string,
    sortOrder?: "asc" | "desc"
  ): Promise<{ users: Array<AdminUserRow & { registrationCount: number }>; total: number }> {
    if (segment === "never") {
      const [records, total] = await Promise.all([
        prisma.user.findMany({
          where: {
            ...realUserWhere(),
            registrations: { none: { status: { not: "CANCELLED" } } },
          },
          include: { _count: { select: { memberships: true, registrations: true } } },
          orderBy: userOrderBy(sortBy, sortOrder),
          take: limit,
          skip: offset,
        }),
        prisma.user.count({
          where: {
            ...realUserWhere(),
            registrations: { none: { status: { not: "CANCELLED" } } },
          },
        }),
      ]);
      return {
        users: records.map((r) => ({
          id: r.id,
          email: r.email,
          firstName: r.firstName,
          lastName: r.lastName,
          role: r.role,
          circleCount: r._count.memberships,
          momentCount: r._count.registrations,
          registrationCount: r._count.registrations,
          createdAt: r.createdAt,
        })),
        total,
      };
    }

    const havingClause =
      segment === "once"
        ? Prisma.sql`HAVING COUNT(DISTINCT r."momentId") = 1`
        : Prisma.sql`HAVING COUNT(DISTINCT r."momentId") >= 2`;

    const sortCol = ACTIVATION_SQL_SORT[sortBy ?? ""] ?? 'u."createdAt"';
    const sortDir = sortOrder === "asc" ? "ASC" : "DESC";
    const orderByClause = Prisma.sql`ORDER BY ${Prisma.raw(sortCol)} ${Prisma.raw(sortDir)}`;

    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<
        Array<{
          id: string;
          email: string;
          firstName: string | null;
          lastName: string | null;
          role: string;
          createdAt: Date;
          registrationCount: bigint;
          circleCount: bigint;
        }>
      >`
        SELECT
          u.id,
          u.email,
          u."firstName",
          u."lastName",
          u.role,
          u."createdAt",
          COUNT(DISTINCT r."momentId")::bigint AS "registrationCount",
          COUNT(DISTINCT cm."circleId")::bigint AS "circleCount"
        FROM users u
        JOIN registrations r ON r."userId" = u.id
        LEFT JOIN circle_memberships cm ON cm."userId" = u.id
        WHERE r.status != 'CANCELLED'
          AND u.email NOT LIKE '%@demo.playground'
          AND u.email NOT LIKE '%@test.playground'
        GROUP BY u.id
        ${havingClause}
        ${orderByClause}
        LIMIT ${limit} OFFSET ${offset}
      `,
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM (
          SELECT u.id
          FROM users u
          JOIN registrations r ON r."userId" = u.id
          WHERE r.status != 'CANCELLED'
            AND u.email NOT LIKE '%@demo.playground'
            AND u.email NOT LIKE '%@test.playground'
          GROUP BY u.id
          ${havingClause}
        ) sub
      `,
    ]);

    return {
      users: rows.map((r) => ({
        id: r.id,
        email: r.email,
        firstName: r.firstName,
        lastName: r.lastName,
        role: r.role as AdminUserRow["role"],
        circleCount: Number(r.circleCount),
        momentCount: Number(r.registrationCount),
        registrationCount: Number(r.registrationCount),
        createdAt: r.createdAt,
      })),
      total: Number(countRows[0]?.count ?? 0),
    };
  },
};

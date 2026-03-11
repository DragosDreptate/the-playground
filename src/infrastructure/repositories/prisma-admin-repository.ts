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
  AdminMomentFilters,
  AdminMomentRow,
  AdminMomentDetail,
} from "@/domain/ports/repositories/admin-repository";
import type { MomentStatus } from "@/domain/models/moment";
import { Prisma } from "@prisma/client";

const DEFAULT_LIMIT = 20;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function sevenDaysAgo(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

function userWhere(filters: AdminUserFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};
  if (filters.role) where.role = filters.role;
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
  const where: Prisma.CircleWhereInput = {};
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
  const where: Prisma.MomentWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { slug: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  return where;
}

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
    const [
      totalUsers,
      totalCircles,
      totalMoments,
      totalRegistrations,
      totalComments,
      recentUsers,
      recentCircles,
      recentMoments,
      recentComments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.circle.count(),
      prisma.moment.count(),
      prisma.registration.count({ where: { status: { not: "CANCELLED" } } }),
      prisma.comment.count(),
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      prisma.circle.count({ where: { createdAt: { gte: since } } }),
      prisma.moment.count({ where: { createdAt: { gte: since } } }),
      prisma.comment.count({ where: { createdAt: { gte: since } } }),
    ]);
    return {
      totalUsers,
      totalCircles,
      totalMoments,
      totalRegistrations,
      totalComments,
      recentUsers,
      recentCircles,
      recentMoments,
      recentComments,
    };
  },

  async getTimeSeries(days: number): Promise<AdminTimeSeries> {
    const since = daysAgo(days);
    const [userRows, registrationRows, momentRows] = await Promise.all([
      prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE_TRUNC('day', "createdAt")::date AS date, COUNT(*)::bigint AS count
        FROM users
        WHERE "createdAt" >= ${since}
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY date ASC
      `,
      prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE_TRUNC('day', "createdAt")::date AS date, COUNT(*)::bigint AS count
        FROM registrations
        WHERE status != 'CANCELLED' AND "createdAt" >= ${since}
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY date ASC
      `,
      prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE_TRUNC('day', "createdAt")::date AS date, COUNT(*)::bigint AS count
        FROM moments
        WHERE "createdAt" >= ${since}
        GROUP BY DATE_TRUNC('day', "createdAt")
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
      prisma.user.count(),
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT "userId")::bigint AS count
        FROM registrations
        WHERE status != 'CANCELLED'
      `,
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM (
          SELECT "userId"
          FROM registrations
          WHERE status != 'CANCELLED'
          GROUP BY "userId"
          HAVING COUNT(DISTINCT "momentId") >= 2
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
      orderBy: { createdAt: "desc" },
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
      orderBy: { createdAt: "desc" },
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
    };
  },

  async deleteCircle(id: string): Promise<void> {
    await prisma.circle.delete({ where: { id } });
  },

  // ── Moments ──────────────────────────────

  async findAllMoments(filters: AdminMomentFilters): Promise<AdminMomentRow[]> {
    const records = await prisma.moment.findMany({
      where: momentWhere(filters),
      include: {
        circle: { select: { name: true } },
        _count: { select: { registrations: true, comments: true } },
      },
      orderBy: { createdAt: "desc" },
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
};

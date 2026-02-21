import { prisma } from "@/infrastructure/db/prisma";
import type {
  AdminRepository,
  AdminStats,
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
      recentUsers,
      recentCircles,
      recentMoments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.circle.count(),
      prisma.moment.count(),
      prisma.registration.count({ where: { status: { not: "CANCELLED" } } }),
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      prisma.circle.count({ where: { createdAt: { gte: since } } }),
      prisma.moment.count({ where: { createdAt: { gte: since } } }),
    ]);
    return {
      totalUsers,
      totalCircles,
      totalMoments,
      totalRegistrations,
      recentUsers,
      recentCircles,
      recentMoments,
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
    await prisma.user.delete({ where: { id } });
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
        _count: { select: { registrations: true } },
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
        registrations: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
          orderBy: { registeredAt: "desc" },
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
      capacity: record.capacity,
      startsAt: record.startsAt,
      createdAt: record.createdAt,
      createdByEmail: record.createdBy.email,
      createdByName: [record.createdBy.firstName, record.createdBy.lastName]
        .filter(Boolean)
        .join(" ") || null,
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

import { prisma, Prisma } from "@/infrastructure/db/prisma";
import { excludeTestHostFilter } from "@/infrastructure/db/explorer-filters";
import type {
  MomentRepository,
  MomentForReminder,
  CreateMomentInput,
  UpdateMomentInput,
  PublicMomentFilters,
  PublicMoment,
  UpcomingCircleMoment,
} from "@/domain/ports/repositories/moment-repository";
import type { Moment, CoverImageAttribution, HostMomentSummary } from "@/domain/models/moment";
import type { PublicMomentRegistration } from "@/domain/models/user";
import type { Moment as PrismaMoment } from "@prisma/client";

function toDomainMoment(record: PrismaMoment): Moment {
  return {
    id: record.id,
    slug: record.slug,
    circleId: record.circleId,
    createdById: record.createdById,
    title: record.title,
    description: record.description,
    coverImage: record.coverImage ?? null,
    coverImageAttribution: record.coverImageAttribution
      ? (record.coverImageAttribution as CoverImageAttribution)
      : null,
    startsAt: record.startsAt,
    endsAt: record.endsAt,
    locationType: record.locationType,
    locationName: record.locationName,
    locationAddress: record.locationAddress,
    videoLink: record.videoLink,
    capacity: record.capacity,
    price: record.price,
    currency: record.currency,
    status: record.status,
    refundable: record.refundable,
    requiresApproval: record.requiresApproval,
    broadcastSentAt: record.broadcastSentAt,
    reminder24hSentAt: record.reminder24hSentAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export const prismaMomentRepository: MomentRepository = {
  async create(input: CreateMomentInput): Promise<Moment> {
    const record = await prisma.moment.create({
      data: {
        slug: input.slug,
        circleId: input.circleId,
        createdById: input.createdById,
        title: input.title,
        description: input.description,
        coverImage: input.coverImage ?? null,
        coverImageAttribution: input.coverImageAttribution ?? Prisma.DbNull,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        locationType: input.locationType,
        locationName: input.locationName,
        locationAddress: input.locationAddress,
        videoLink: input.videoLink,
        capacity: input.capacity,
        price: input.price,
        currency: input.currency,
        status: input.status,
        ...(input.requiresApproval !== undefined && { requiresApproval: input.requiresApproval }),
      },
    });
    return toDomainMoment(record);
  },

  async findById(id: string): Promise<Moment | null> {
    const record = await prisma.moment.findUnique({ where: { id } });
    return record ? toDomainMoment(record) : null;
  },

  async findBySlug(slug: string): Promise<Moment | null> {
    const record = await prisma.moment.findUnique({ where: { slug } });
    return record ? toDomainMoment(record) : null;
  },

  async findByCircleId(circleId: string): Promise<Moment[]> {
    const records = await prisma.moment.findMany({
      where: { circleId },
      orderBy: { startsAt: "asc" },
    });
    return records.map(toDomainMoment);
  },

  async update(id: string, input: UpdateMomentInput): Promise<Moment> {
    const record = await prisma.moment.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.coverImage !== undefined && { coverImage: input.coverImage }),
        ...(input.coverImageAttribution !== undefined && {
          coverImageAttribution:
            input.coverImageAttribution === null ? Prisma.DbNull : input.coverImageAttribution,
        }),
        ...(input.startsAt !== undefined && { startsAt: input.startsAt }),
        ...(input.endsAt !== undefined && { endsAt: input.endsAt }),
        ...(input.locationType !== undefined && { locationType: input.locationType }),
        ...(input.locationName !== undefined && { locationName: input.locationName }),
        ...(input.locationAddress !== undefined && { locationAddress: input.locationAddress }),
        ...(input.videoLink !== undefined && { videoLink: input.videoLink }),
        ...(input.capacity !== undefined && { capacity: input.capacity }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.currency !== undefined && { currency: input.currency }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.refundable !== undefined && { refundable: input.refundable }),
        ...(input.requiresApproval !== undefined && { requiresApproval: input.requiresApproval }),
      },
    });
    return toDomainMoment(record);
  },

  async delete(id: string): Promise<void> {
    await prisma.moment.delete({ where: { id } });
  },

  async slugExists(slug: string): Promise<boolean> {
    const count = await prisma.moment.count({ where: { slug } });
    return count > 0;
  },

  async transitionPastMoments(): Promise<number> {
    const now = new Date();
    const result = await prisma.moment.updateMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { endsAt: { lte: now } },
          { endsAt: null, startsAt: { lte: now } },
        ],
      },
      data: { status: "PAST" },
    });
    return result.count;
  },

  async findPublicUpcoming(filters: PublicMomentFilters): Promise<PublicMoment[]> {
    const now = new Date();
    const orderBy =
      filters.sortBy === "date"
        ? { startsAt: "asc" as const }
        : [{ explorerScore: "desc" as const }, { startsAt: "asc" as const }];

    const moments = await prisma.moment.findMany({
      where: {
        status: "PUBLISHED",
        startsAt: { gte: now },
        circle: {
          visibility: "PUBLIC",
          excludedFromExplorer: false,
          NOT: excludeTestHostFilter(),
          ...(filters.category && { category: filters.category }),
        },
      },
      include: {
        circle: { select: { slug: true, name: true, category: true, customCategory: true, city: true, isDemo: true } },
        _count: { select: { registrations: { where: { status: "REGISTERED" } } } },
        registrations: {
          where: { status: "REGISTERED" },
          select: { user: { select: { firstName: true, lastName: true, email: true, image: true } } },
          orderBy: { registeredAt: "asc" },
          take: 3,
        },
      },
      orderBy,
      take: filters.limit ?? 20,
      skip: filters.offset ?? 0,
    });

    return moments.map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.title,
      description: m.description ?? null,
      coverImage: m.coverImage ?? null,
      startsAt: m.startsAt,
      endsAt: m.endsAt,
      locationType: m.locationType,
      locationName: m.locationName,
      registrationCount: m._count.registrations,
      capacity: m.capacity,
      explorerScore: m.explorerScore,
      topAttendees: m.registrations.map((r) => ({ user: r.user })),
      circle: {
        slug: m.circle.slug,
        name: m.circle.name,
        category: m.circle.category ?? null,
        customCategory: m.circle.customCategory ?? null,
        city: m.circle.city ?? null,
        isDemo: m.circle.isDemo,
      },
    }));
  },

  async findUpcomingByCircleId(
    circleId: string,
    excludeMomentId: string,
    limit: number
  ): Promise<UpcomingCircleMoment[]> {
    const now = new Date();
    const records = await prisma.moment.findMany({
      where: {
        circleId,
        id: { not: excludeMomentId },
        status: "PUBLISHED",
        startsAt: { gte: now },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        coverImage: true,
        startsAt: true,
        locationType: true,
        locationName: true,
        locationAddress: true,
        _count: { select: { registrations: { where: { status: "REGISTERED" } } } },
      },
      orderBy: { startsAt: "asc" },
      take: limit,
    });

    return records.map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.title,
      coverImage: m.coverImage ?? null,
      startsAt: m.startsAt,
      locationType: m.locationType,
      locationName: m.locationName,
      locationAddress: m.locationAddress,
      registrationCount: m._count.registrations,
    }));
  },

  async findUpcomingByHostUserId(hostUserId: string): Promise<HostMomentSummary[]> {
    const now = new Date();
    const records = await prisma.moment.findMany({
      where: {
        status: { in: ["DRAFT", "PUBLISHED"] },
        startsAt: { gte: now },
        circle: {
          memberships: { some: { userId: hostUserId, role: "HOST" } },
        },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        coverImage: true,
        startsAt: true,
        endsAt: true,
        locationType: true,
        locationName: true,
        status: true,
        circle: { select: { slug: true, name: true, coverImage: true } },
        _count: { select: { registrations: { where: { status: "REGISTERED" } } } },
      },
      orderBy: { startsAt: "asc" },
    });

    return records.map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.title,
      coverImage: m.coverImage ?? null,
      startsAt: m.startsAt,
      endsAt: m.endsAt,
      locationType: m.locationType,
      locationName: m.locationName,
      status: m.status,
      registrationCount: m._count.registrations,
      topAttendees: [],
      circle: {
        slug: m.circle.slug,
        name: m.circle.name,
        coverImage: m.circle.coverImage ?? null,
      },
    }));
  },

  async findAllByHostUserId(
    hostUserId: string
  ): Promise<{ upcoming: HostMomentSummary[]; past: HostMomentSummary[] }> {
    const records = await prisma.moment.findMany({
      where: {
        status: { in: ["DRAFT", "PUBLISHED", "PAST"] },
        circle: {
          memberships: { some: { userId: hostUserId, role: "HOST" } },
        },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        coverImage: true,
        startsAt: true,
        endsAt: true,
        locationType: true,
        locationName: true,
        status: true,
        circle: { select: { slug: true, name: true, coverImage: true } },
        _count: { select: { registrations: { where: { status: "REGISTERED" } } } },
        registrations: {
          where: { status: "REGISTERED" },
          select: { user: { select: { firstName: true, lastName: true, email: true, image: true } } },
          orderBy: { registeredAt: "asc" },
          take: 3,
        },
      },
      orderBy: { startsAt: "asc" },
    });

    const toItem = (m: (typeof records)[number]): HostMomentSummary => ({
      id: m.id,
      slug: m.slug,
      title: m.title,
      coverImage: m.coverImage ?? null,
      startsAt: m.startsAt,
      endsAt: m.endsAt,
      locationType: m.locationType,
      locationName: m.locationName,
      status: m.status,
      registrationCount: m._count.registrations,
      topAttendees: m.registrations.map((r) => ({ user: r.user })),
      circle: { slug: m.circle.slug, name: m.circle.name, coverImage: m.circle.coverImage ?? null },
    });

    const upcoming: HostMomentSummary[] = [];
    const past: HostMomentSummary[] = [];
    for (const m of records) {
      if (m.status === "PAST") past.push(toItem(m));
      else upcoming.push(toItem(m));
    }
    // Les moments passés doivent être triés par date décroissante
    past.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());

    return { upcoming, past };
  },

  async markBroadcastSent(momentId: string): Promise<void> {
    await prisma.moment.update({
      where: { id: momentId },
      data: { broadcastSentAt: new Date() },
    });
  },

  async findPastByHostUserId(hostUserId: string): Promise<HostMomentSummary[]> {
    const records = await prisma.moment.findMany({
      where: {
        status: "PAST",
        circle: {
          memberships: { some: { userId: hostUserId, role: "HOST" } },
        },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        coverImage: true,
        startsAt: true,
        endsAt: true,
        locationType: true,
        locationName: true,
        status: true,
        circle: { select: { slug: true, name: true, coverImage: true } },
        _count: { select: { registrations: { where: { status: "REGISTERED" } } } },
      },
      orderBy: { startsAt: "desc" },
    });

    return records.map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.title,
      coverImage: m.coverImage ?? null,
      startsAt: m.startsAt,
      endsAt: m.endsAt,
      locationType: m.locationType,
      locationName: m.locationName,
      status: m.status,
      registrationCount: m._count.registrations,
      topAttendees: [],
      circle: {
        slug: m.circle.slug,
        name: m.circle.name,
        coverImage: m.circle.coverImage ?? null,
      },
    }));
  },

  async findMomentsNeedingReminder(windowStart: Date, windowEnd: Date): Promise<MomentForReminder[]> {
    const moments = await prisma.moment.findMany({
      where: {
        status: "PUBLISHED",
        startsAt: { gte: windowStart, lte: windowEnd },
        reminder24hSentAt: null,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        startsAt: true,
        endsAt: true,
        locationType: true,
        locationName: true,
        videoLink: true,
        circle: { select: { name: true, slug: true } },
        registrations: {
          where: { status: "REGISTERED" },
          select: {
            user: { select: { email: true, name: true } },
          },
        },
      },
    });

    return moments.map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.title,
      description: m.description,
      startsAt: m.startsAt,
      endsAt: m.endsAt,
      locationType: m.locationType,
      videoLink: m.videoLink,
      locationName: m.locationName,
      circle: { name: m.circle.name, slug: m.circle.slug },
      registeredUsers: m.registrations.map((r) => ({
        email: r.user.email!,
        name: r.user.name,
      })),
    }));
  },

  async markReminderSent(momentId: string): Promise<void> {
    await prisma.moment.update({
      where: { id: momentId },
      data: { reminder24hSentAt: new Date() },
    });
  },

  async getUpcomingPublicMomentsForUser(userId: string): Promise<PublicMomentRegistration[]> {
    const now = new Date();
    const registrations = await prisma.registration.findMany({
      where: {
        userId,
        status: "REGISTERED",
        moment: {
          status: "PUBLISHED",
          startsAt: { gt: now },
          circle: { visibility: "PUBLIC" },
        },
      },
      include: {
        moment: {
          select: {
            slug: true,
            title: true,
            startsAt: true,
            circle: { select: { name: true } },
          },
        },
      },
      orderBy: { moment: { startsAt: "asc" } },
    });

    return registrations.map((r) => ({
      momentSlug: r.moment.slug,
      momentTitle: r.moment.title,
      momentDate: r.moment.startsAt,
      circleName: r.moment.circle.name,
    }));
  },
};

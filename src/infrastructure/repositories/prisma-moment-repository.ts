import { prisma, Prisma } from "@/infrastructure/db/prisma";
import type {
  MomentRepository,
  CreateMomentInput,
  UpdateMomentInput,
  PublicMomentFilters,
  PublicMoment,
} from "@/domain/ports/repositories/moment-repository";
import type { Moment, CoverImageAttribution } from "@/domain/models/moment";
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
    const moments = await prisma.moment.findMany({
      where: {
        status: "PUBLISHED",
        startsAt: { gte: now },
        circle: {
          visibility: "PUBLIC",
          ...(filters.category && { category: filters.category }),
        },
      },
      include: {
        circle: { select: { slug: true, name: true, category: true, city: true } },
        _count: { select: { registrations: { where: { status: "REGISTERED" } } } },
      },
      orderBy: { startsAt: "asc" },
      take: filters.limit ?? 20,
      skip: filters.offset ?? 0,
    });

    return moments.map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.title,
      coverImage: m.coverImage ?? null,
      startsAt: m.startsAt,
      endsAt: m.endsAt,
      locationType: m.locationType,
      locationName: m.locationName,
      registrationCount: m._count.registrations,
      capacity: m.capacity,
      circle: {
        slug: m.circle.slug,
        name: m.circle.name,
        category: m.circle.category ?? null,
        city: m.circle.city ?? null,
      },
    }));
  },
};

import { prisma } from "@/infrastructure/db/prisma";
import type {
  CircleNetworkRepository,
  CreateCircleNetworkInput,
  UpdateCircleNetworkInput,
  CircleNetworkWithCount,
  NetworkCircleSearchResult,
} from "@/domain/ports/repositories/circle-network-repository";
import type { CircleNetwork, CircleNetworkWithCircles } from "@/domain/models/circle-network";
import type { PublicCircle } from "@/domain/ports/repositories/circle-repository";
import type { CoverImageAttribution } from "@/domain/models/circle";
import type { CircleNetwork as PrismaCircleNetwork } from "@prisma/client";

function toDomainNetwork(record: PrismaCircleNetwork): CircleNetwork {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    description: record.description,
    coverImage: record.coverImage,
    website: record.website,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toPublicCircle(c: {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string | null;
  customCategory: string | null;
  city: string | null;
  coverImage: string | null;
  coverImageAttribution: unknown;
  isDemo: boolean;
  explorerScore: number;
  _count: { memberships: number; moments: number };
  moments: { title: string; startsAt: Date }[];
  memberships: { user: { firstName: string | null; lastName: string | null; email: string; image: string | null } }[];
}): PublicCircle {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    category: c.category as PublicCircle["category"],
    customCategory: c.customCategory,
    city: c.city,
    coverImage: c.coverImage,
    coverImageAttribution: c.coverImageAttribution
      ? (c.coverImageAttribution as CoverImageAttribution)
      : null,
    memberCount: c._count.memberships,
    upcomingMomentCount: c._count.moments,
    topMembers: c.memberships.map((m) => ({ user: m.user })),
    nextMoment: c.moments[0] ?? null,
    isDemo: c.isDemo,
    explorerScore: c.explorerScore,
  };
}

const circleIncludeForPublic = (now: Date) => ({
  _count: {
    select: {
      memberships: { where: { status: "ACTIVE" as const } },
      moments: {
        where: { status: "PUBLISHED" as const, startsAt: { gte: now } },
      },
    },
  },
  moments: {
    where: { status: "PUBLISHED" as const, startsAt: { gte: now } },
    orderBy: { startsAt: "asc" as const },
    take: 1,
    select: { title: true, startsAt: true },
  },
  memberships: {
    where: { status: "ACTIVE" as const },
    orderBy: { joinedAt: "asc" as const },
    take: 3,
    select: {
      user: {
        select: { firstName: true, lastName: true, email: true, image: true },
      },
    },
  },
});

export const prismaCircleNetworkRepository: CircleNetworkRepository = {
  async findBySlug(slug: string): Promise<CircleNetworkWithCircles | null> {
    const now = new Date();
    const network = await prisma.circleNetwork.findUnique({
      where: { slug },
      include: {
        circles: {
          orderBy: { addedAt: "asc" },
          include: {
            circle: {
              include: circleIncludeForPublic(now),
            },
          },
        },
      },
    });

    if (!network) return null;

    // Filtrer uniquement les Circles PUBLIC pour la page publique
    const publicCircles = network.circles
      .filter((m) => m.circle.visibility === "PUBLIC")
      .map((m) => toPublicCircle(m.circle));

    return {
      ...toDomainNetwork(network),
      circles: publicCircles,
    };
  },

  async findNetworksByCircleId(circleId: string): Promise<CircleNetwork[]> {
    const memberships = await prisma.circleNetworkMembership.findMany({
      where: { circleId },
      include: { network: true },
      orderBy: { addedAt: "asc" },
    });
    return memberships.map((m) => toDomainNetwork(m.network));
  },

  async findAll(): Promise<CircleNetworkWithCount[]> {
    const networks = await prisma.circleNetwork.findMany({
      include: { _count: { select: { circles: true } } },
      orderBy: { createdAt: "desc" },
    });
    return networks.map((n) => ({
      ...toDomainNetwork(n),
      circleCount: n._count.circles,
    }));
  },

  async findById(id: string): Promise<CircleNetworkWithCircles | null> {
    const now = new Date();
    const network = await prisma.circleNetwork.findUnique({
      where: { id },
      include: {
        circles: {
          orderBy: { addedAt: "asc" },
          include: {
            circle: {
              include: circleIncludeForPublic(now),
            },
          },
        },
      },
    });

    if (!network) return null;

    // Admin voit TOUS les circles (PUBLIC + PRIVATE)
    return {
      ...toDomainNetwork(network),
      circles: network.circles.map((m) => toPublicCircle(m.circle)),
    };
  },

  async create(input: CreateCircleNetworkInput): Promise<CircleNetwork> {
    const record = await prisma.circleNetwork.create({
      data: {
        slug: input.slug,
        name: input.name,
        ...(input.description && { description: input.description }),
        ...(input.coverImage && { coverImage: input.coverImage }),
        ...(input.website && { website: input.website }),
      },
    });
    return toDomainNetwork(record);
  },

  async update(
    id: string,
    input: UpdateCircleNetworkInput
  ): Promise<CircleNetwork> {
    const record = await prisma.circleNetwork.update({
      where: { id },
      data: {
        ...(input.slug !== undefined && { slug: input.slug }),
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.coverImage !== undefined && { coverImage: input.coverImage }),
        ...(input.website !== undefined && { website: input.website }),
      },
    });
    return toDomainNetwork(record);
  },

  async delete(id: string): Promise<void> {
    await prisma.circleNetwork.delete({ where: { id } });
  },

  async addCircle(networkId: string, circleId: string): Promise<void> {
    await prisma.circleNetworkMembership.create({
      data: { networkId, circleId },
    });
  },

  async removeCircle(networkId: string, circleId: string): Promise<void> {
    await prisma.circleNetworkMembership.delete({
      where: { networkId_circleId: { networkId, circleId } },
    });
  },

  async searchCirclesNotInNetwork(
    networkId: string,
    query: string
  ): Promise<NetworkCircleSearchResult[]> {
    const existingCircleIds = await prisma.circleNetworkMembership.findMany({
      where: { networkId },
      select: { circleId: true },
    });
    const excludeIds = existingCircleIds.map((m) => m.circleId);

    const circles = await prisma.circle.findMany({
      where: {
        id: { notIn: excludeIds },
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { slug: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        city: true,
        visibility: true,
      },
      take: 10,
      orderBy: { name: "asc" },
    });

    return circles;
  },
};

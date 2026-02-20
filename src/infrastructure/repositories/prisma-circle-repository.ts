import { prisma } from "@/infrastructure/db/prisma";
import type {
  CircleRepository,
  CreateCircleInput,
  UpdateCircleInput,
} from "@/domain/ports/repositories/circle-repository";
import type { Circle, CircleMembership, CircleMemberRole, CircleWithRole } from "@/domain/models/circle";
import type { Circle as PrismaCircle, CircleMembership as PrismaMembership } from "@prisma/client";

function toDomainCircle(record: PrismaCircle): Circle {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    description: record.description,
    logo: record.logo,
    visibility: record.visibility,
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
};

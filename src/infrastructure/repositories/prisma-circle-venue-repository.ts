import type { CircleVenue } from "@/domain/models/circle-venue";
import type {
  CircleVenueRepository,
  CreateCircleVenueInput,
  UpdateCircleVenueInput,
} from "@/domain/ports/repositories/circle-venue-repository";
import { prisma } from "@/infrastructure/db/prisma";
import type { CircleVenue as PrismaCircleVenue } from "@prisma/client";

function toDomainCircleVenue(record: PrismaCircleVenue): CircleVenue {
  return {
    id: record.id,
    circleId: record.circleId,
    name: record.name,
    address: record.address,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export const prismaCircleVenueRepository: CircleVenueRepository = {
  async create(input: CreateCircleVenueInput): Promise<CircleVenue> {
    const record = await prisma.circleVenue.create({
      data: input,
    });
    return toDomainCircleVenue(record);
  },

  async findById(id: string): Promise<CircleVenue | null> {
    const record = await prisma.circleVenue.findUnique({ where: { id } });
    return record ? toDomainCircleVenue(record) : null;
  },

  async findByCircleId(circleId: string): Promise<CircleVenue[]> {
    const records = await prisma.circleVenue.findMany({
      where: { circleId },
      orderBy: [{ name: "asc" }, { address: "asc" }],
    });
    return records.map(toDomainCircleVenue);
  },

  async update(id: string, input: UpdateCircleVenueInput): Promise<CircleVenue> {
    const record = await prisma.$transaction(async (tx) => {
      const updated = await tx.circleVenue.update({
        where: { id },
        data: input,
      });

      await tx.moment.updateMany({
        where: {
          circleVenueId: id,
          status: { in: ["DRAFT", "PUBLISHED"] },
        },
        data: {
          locationName: updated.name,
          locationAddress: updated.address,
        },
      });

      return updated;
    });
    return toDomainCircleVenue(record);
  },

  async delete(id: string): Promise<void> {
    await prisma.circleVenue.delete({ where: { id } });
  },
};

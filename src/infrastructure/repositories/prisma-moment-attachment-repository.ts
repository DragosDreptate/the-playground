import { prisma } from "@/infrastructure/db/prisma";
import type {
  MomentAttachmentRepository,
  CreateMomentAttachmentInput,
} from "@/domain/ports/repositories/moment-attachment-repository";
import type { MomentAttachment } from "@/domain/models/moment-attachment";
import type { MomentAttachment as PrismaMomentAttachment } from "@prisma/client";

function toDomain(record: PrismaMomentAttachment): MomentAttachment {
  return {
    id: record.id,
    momentId: record.momentId,
    url: record.url,
    filename: record.filename,
    contentType: record.contentType,
    sizeBytes: record.sizeBytes,
    createdAt: record.createdAt,
  };
}

export const prismaMomentAttachmentRepository: MomentAttachmentRepository = {
  async create(input: CreateMomentAttachmentInput): Promise<MomentAttachment> {
    const record = await prisma.momentAttachment.create({
      data: {
        momentId: input.momentId,
        url: input.url,
        filename: input.filename,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
      },
    });
    return toDomain(record);
  },

  async findById(id: string): Promise<MomentAttachment | null> {
    const record = await prisma.momentAttachment.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  },

  async findByMoment(momentId: string): Promise<MomentAttachment[]> {
    const records = await prisma.momentAttachment.findMany({
      where: { momentId },
      orderBy: { createdAt: "asc" },
    });
    return records.map(toDomain);
  },

  async countByMoment(momentId: string): Promise<number> {
    return prisma.momentAttachment.count({ where: { momentId } });
  },

  async delete(id: string): Promise<void> {
    await prisma.momentAttachment.delete({ where: { id } });
  },
};

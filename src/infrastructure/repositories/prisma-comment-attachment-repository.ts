import { prisma } from "@/infrastructure/db/prisma";
import type {
  CommentAttachmentRepository,
  CreateCommentAttachmentInput,
} from "@/domain/ports/repositories/comment-attachment-repository";
import type { CommentAttachment } from "@/domain/models/comment-attachment";
import type { CommentAttachment as PrismaCommentAttachment } from "@prisma/client";

function toDomain(record: PrismaCommentAttachment): CommentAttachment {
  return {
    id: record.id,
    commentId: record.commentId,
    url: record.url,
    filename: record.filename,
    contentType: record.contentType,
    sizeBytes: record.sizeBytes,
    createdAt: record.createdAt,
  };
}

export const prismaCommentAttachmentRepository: CommentAttachmentRepository = {
  async create(input: CreateCommentAttachmentInput): Promise<CommentAttachment> {
    const record = await prisma.commentAttachment.create({
      data: {
        commentId: input.commentId,
        url: input.url,
        filename: input.filename,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
      },
    });
    return toDomain(record);
  },

  async findByComment(commentId: string): Promise<CommentAttachment[]> {
    const records = await prisma.commentAttachment.findMany({
      where: { commentId },
      orderBy: { createdAt: "asc" },
    });
    return records.map(toDomain);
  },

  async deleteByComment(commentId: string): Promise<void> {
    await prisma.commentAttachment.deleteMany({ where: { commentId } });
  },
};

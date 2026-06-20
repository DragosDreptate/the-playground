import { prisma } from "@/infrastructure/db/prisma";
import type {
  CommentRepository,
  CreateCommentInput,
} from "@/domain/ports/repositories/comment-repository";
import type {
  Comment,
  CommentStatus,
  CommentWithUser,
} from "@/domain/models/comment";
import type { CommentAttachment } from "@/domain/models/comment-attachment";
import type {
  Comment as PrismaComment,
  CommentAttachment as PrismaCommentAttachment,
} from "@prisma/client";

function toDomainComment(record: PrismaComment): Comment {
  return {
    id: record.id,
    momentId: record.momentId,
    userId: record.userId,
    content: record.content,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toDomainCommentAttachment(
  record: PrismaCommentAttachment
): CommentAttachment {
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

type PrismaCommentWithUser = PrismaComment & {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    image: string | null;
  };
  attachments: PrismaCommentAttachment[];
};

function toDomainCommentWithUser(record: PrismaCommentWithUser): CommentWithUser {
  return {
    ...toDomainComment(record),
    user: {
      id: record.user.id,
      firstName: record.user.firstName,
      lastName: record.user.lastName,
      email: record.user.email,
      image: record.user.image,
    },
    attachments: record.attachments.map(toDomainCommentAttachment),
  };
}

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  image: true,
} as const;

export const prismaCommentRepository: CommentRepository = {
  async create(input: CreateCommentInput): Promise<Comment> {
    const record = await prisma.comment.create({
      data: {
        momentId: input.momentId,
        userId: input.userId,
        content: input.content,
        // undefined → Prisma applique @default(PUBLISHED).
        status: input.status,
      },
    });
    return toDomainComment(record);
  },

  async findById(id: string): Promise<Comment | null> {
    const record = await prisma.comment.findUnique({ where: { id } });
    return record ? toDomainComment(record) : null;
  },

  async findByMomentIdWithUser(
    momentId: string,
    viewerId?: string
  ): Promise<CommentWithUser[]> {
    const records = await prisma.comment.findMany({
      // PUBLISHED pour tous + ses propres PENDING_REVIEW pour l'auteur courant.
      where: {
        momentId,
        OR: [
          { status: "PUBLISHED" },
          ...(viewerId ? [{ userId: viewerId }] : []),
        ],
      },
      include: {
        user: { select: userSelect },
        attachments: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    });
    return records.map(toDomainCommentWithUser);
  },

  async delete(id: string): Promise<void> {
    await prisma.comment.delete({ where: { id } });
  },

  async countByMomentId(momentId: string): Promise<number> {
    return prisma.comment.count({ where: { momentId, status: "PUBLISHED" } });
  },

  async updateStatus(id: string, status: CommentStatus): Promise<void> {
    await prisma.comment.update({ where: { id }, data: { status } });
  },
};

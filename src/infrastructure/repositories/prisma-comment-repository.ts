import { prisma } from "@/infrastructure/db/prisma";
import type {
  CommentRepository,
  CreateCommentInput,
} from "@/domain/ports/repositories/comment-repository";
import type { Comment, CommentWithUser } from "@/domain/models/comment";
import type { Comment as PrismaComment } from "@prisma/client";

function toDomainComment(record: PrismaComment): Comment {
  return {
    id: record.id,
    momentId: record.momentId,
    userId: record.userId,
    content: record.content,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
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
  };
}

export const prismaCommentRepository: CommentRepository = {
  async create(input: CreateCommentInput): Promise<Comment> {
    const record = await prisma.comment.create({
      data: {
        momentId: input.momentId,
        userId: input.userId,
        content: input.content,
      },
    });
    return toDomainComment(record);
  },

  async findById(id: string): Promise<Comment | null> {
    const record = await prisma.comment.findUnique({ where: { id } });
    return record ? toDomainComment(record) : null;
  },

  async findByMomentIdWithUser(momentId: string): Promise<CommentWithUser[]> {
    const records = await prisma.comment.findMany({
      where: { momentId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return records.map(toDomainCommentWithUser);
  },

  async delete(id: string): Promise<void> {
    await prisma.comment.delete({ where: { id } });
  },

  async countByMomentId(momentId: string): Promise<number> {
    return prisma.comment.count({ where: { momentId } });
  },
};

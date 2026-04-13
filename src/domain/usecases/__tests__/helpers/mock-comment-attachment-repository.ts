import type { CommentAttachmentRepository } from "@/domain/ports/repositories/comment-attachment-repository";
import type { CommentAttachment } from "@/domain/models/comment-attachment";
import { vi } from "vitest";

export function createMockCommentAttachmentRepository(
  overrides: Partial<CommentAttachmentRepository> = {}
): CommentAttachmentRepository {
  return {
    create: vi
      .fn<CommentAttachmentRepository["create"]>()
      .mockImplementation(async (input) => ({
        id: `att-${Date.now()}`,
        ...input,
        createdAt: new Date("2026-01-01"),
      })),
    findByComment: vi
      .fn<CommentAttachmentRepository["findByComment"]>()
      .mockResolvedValue([]),
    deleteByComment: vi
      .fn<CommentAttachmentRepository["deleteByComment"]>()
      .mockResolvedValue(undefined),
    ...overrides,
  };
}

export function makeCommentAttachment(
  overrides: Partial<CommentAttachment> = {}
): CommentAttachment {
  return {
    id: "att-1",
    commentId: "comment-1",
    url: "https://public.blob.vercel-storage.com/comment-photos/test.jpg",
    filename: "photo.jpg",
    contentType: "image/jpeg",
    sizeBytes: 100_000,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

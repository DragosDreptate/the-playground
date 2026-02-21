import type { CommentRepository } from "@/domain/ports/repositories/comment-repository";
import type { Comment, CommentWithUser } from "@/domain/models/comment";
import { vi } from "vitest";

export function createMockCommentRepository(
  overrides: Partial<CommentRepository> = {}
): CommentRepository {
  return {
    create: vi.fn<CommentRepository["create"]>().mockResolvedValue(makeComment()),
    findById: vi.fn<CommentRepository["findById"]>().mockResolvedValue(null),
    findByMomentIdWithUser: vi
      .fn<CommentRepository["findByMomentIdWithUser"]>()
      .mockResolvedValue([]),
    delete: vi.fn<CommentRepository["delete"]>().mockResolvedValue(undefined),
    countByMomentId: vi
      .fn<CommentRepository["countByMomentId"]>()
      .mockResolvedValue(0),
    ...overrides,
  };
}

export function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "comment-1",
    momentId: "moment-1",
    userId: "user-1",
    content: "Great Moment!",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

export function makeCommentWithUser(
  overrides: Partial<CommentWithUser> = {}
): CommentWithUser {
  return {
    ...makeComment(),
    user: {
      id: "user-1",
      firstName: "Alice",
      lastName: "Dupont",
      email: "alice@example.com",
      image: null,
    },
    ...overrides,
  };
}

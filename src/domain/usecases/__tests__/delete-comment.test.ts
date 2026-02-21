import { describe, it, expect, vi } from "vitest";
import { deleteComment } from "@/domain/usecases/delete-comment";
import { createMockCommentRepository, makeComment } from "./helpers/mock-comment-repository";
import { createMockMomentRepository, makeMoment } from "./helpers/mock-moment-repository";
import { createMockCircleRepository, makeMembership } from "./helpers/mock-circle-repository";
import {
  CommentNotFoundError,
  UnauthorizedCommentDeletionError,
} from "@/domain/errors";

describe("DeleteComment", () => {
  function makeDeps(overrides: {
    commentRepository?: Partial<ReturnType<typeof createMockCommentRepository>>;
    momentRepository?: Partial<ReturnType<typeof createMockMomentRepository>>;
    circleRepository?: Partial<ReturnType<typeof createMockCircleRepository>>;
  } = {}) {
    return {
      commentRepository: createMockCommentRepository(overrides.commentRepository),
      momentRepository: createMockMomentRepository(overrides.momentRepository),
      circleRepository: createMockCircleRepository(overrides.circleRepository),
    };
  }

  describe("given the comment author", () => {
    it("should delete the comment", async () => {
      const comment = makeComment({ userId: "user-1" });
      const deps = makeDeps({
        commentRepository: {
          findById: vi.fn().mockResolvedValue(comment),
          delete: vi.fn().mockResolvedValue(undefined),
        },
      });

      await deleteComment({ commentId: "comment-1", userId: "user-1" }, deps);

      expect(deps.commentRepository.delete).toHaveBeenCalledWith("comment-1");
    });
  });

  describe("given a Host of the Circle that owns the Moment", () => {
    it("should delete any comment in their Circle", async () => {
      const comment = makeComment({ userId: "user-2", momentId: "moment-1" });
      const moment = makeMoment({ id: "moment-1", circleId: "circle-1" });
      const hostMembership = makeMembership({ userId: "host-user", circleId: "circle-1", role: "HOST" });
      const deps = makeDeps({
        commentRepository: {
          findById: vi.fn().mockResolvedValue(comment),
          delete: vi.fn().mockResolvedValue(undefined),
        },
        momentRepository: {
          findById: vi.fn().mockResolvedValue(moment),
        },
        circleRepository: {
          findMembership: vi.fn().mockResolvedValue(hostMembership),
        },
      });

      await deleteComment({ commentId: "comment-1", userId: "host-user" }, deps);

      expect(deps.commentRepository.delete).toHaveBeenCalledWith("comment-1");
    });
  });

  describe("given an unauthorized user (not author, not host)", () => {
    it("should throw UnauthorizedCommentDeletionError", async () => {
      const comment = makeComment({ userId: "user-2", momentId: "moment-1" });
      const moment = makeMoment({ id: "moment-1", circleId: "circle-1" });
      const playerMembership = makeMembership({ userId: "user-3", circleId: "circle-1", role: "PLAYER" });
      const deps = makeDeps({
        commentRepository: { findById: vi.fn().mockResolvedValue(comment) },
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        circleRepository: { findMembership: vi.fn().mockResolvedValue(playerMembership) },
      });

      await expect(
        deleteComment({ commentId: "comment-1", userId: "user-3" }, deps)
      ).rejects.toThrow(UnauthorizedCommentDeletionError);

      expect(deps.commentRepository.delete).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedCommentDeletionError when not a member at all", async () => {
      const comment = makeComment({ userId: "user-2", momentId: "moment-1" });
      const moment = makeMoment({ id: "moment-1", circleId: "circle-1" });
      const deps = makeDeps({
        commentRepository: { findById: vi.fn().mockResolvedValue(comment) },
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        circleRepository: { findMembership: vi.fn().mockResolvedValue(null) },
      });

      await expect(
        deleteComment({ commentId: "comment-1", userId: "stranger" }, deps)
      ).rejects.toThrow(UnauthorizedCommentDeletionError);
    });
  });

  describe("given a non-existent comment", () => {
    it("should throw CommentNotFoundError", async () => {
      const deps = makeDeps({
        commentRepository: { findById: vi.fn().mockResolvedValue(null) },
      });

      await expect(
        deleteComment({ commentId: "comment-999", userId: "user-1" }, deps)
      ).rejects.toThrow(CommentNotFoundError);
    });
  });

  describe("given a Host of a different Circle", () => {
    it("should throw UnauthorizedCommentDeletionError", async () => {
      const comment = makeComment({ userId: "user-2", momentId: "moment-1" });
      const moment = makeMoment({ id: "moment-1", circleId: "circle-1" });
      // Host of circle-2, not circle-1
      const otherHostMembership = makeMembership({ userId: "other-host", circleId: "circle-2", role: "HOST" });
      const deps = makeDeps({
        commentRepository: { findById: vi.fn().mockResolvedValue(comment) },
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        // findMembership for circle-1 returns null (not a member of circle-1)
        circleRepository: { findMembership: vi.fn().mockResolvedValue(null) },
      });

      await expect(
        deleteComment({ commentId: "comment-1", userId: "other-host" }, deps)
      ).rejects.toThrow(UnauthorizedCommentDeletionError);
    });
  });
});

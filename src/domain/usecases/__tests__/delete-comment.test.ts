import { describe, it, expect, vi } from "vitest";
import { deleteComment } from "@/domain/usecases/delete-comment";
import { createMockCommentRepository, makeComment } from "./helpers/mock-comment-repository";
import { createMockMomentRepository, makeMoment } from "./helpers/mock-moment-repository";
import { createMockCircleRepository, makeMembership } from "./helpers/mock-circle-repository";
import { createMockCommentAttachmentRepository, makeCommentAttachment } from "./helpers/mock-comment-attachment-repository";
import { createMockStorageService } from "./helpers/mock-storage-service";
import {
  CommentNotFoundError,
  UnauthorizedCommentDeletionError,
} from "@/domain/errors";

describe("DeleteComment", () => {
  function makeDeps(overrides: {
    commentRepository?: Partial<ReturnType<typeof createMockCommentRepository>>;
    momentRepository?: Partial<ReturnType<typeof createMockMomentRepository>>;
    circleRepository?: Partial<ReturnType<typeof createMockCircleRepository>>;
    commentAttachmentRepository?: Partial<ReturnType<typeof createMockCommentAttachmentRepository>>;
    storage?: Partial<ReturnType<typeof createMockStorageService>>;
  } = {}) {
    return {
      commentRepository: createMockCommentRepository(overrides.commentRepository),
      momentRepository: createMockMomentRepository(overrides.momentRepository),
      circleRepository: createMockCircleRepository(overrides.circleRepository),
      commentAttachmentRepository: createMockCommentAttachmentRepository(overrides.commentAttachmentRepository),
      storage: createMockStorageService(overrides.storage),
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
      const deps = makeDeps({
        commentRepository: { findById: vi.fn().mockResolvedValue(comment) },
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        circleRepository: { findMembership: vi.fn().mockResolvedValue(null) },
      });

      await expect(
        deleteComment({ commentId: "comment-1", userId: "other-host" }, deps)
      ).rejects.toThrow(UnauthorizedCommentDeletionError);
    });
  });

  // --- Blob cleanup on deletion ---

  describe("given a comment with photo attachments", () => {
    it("should delete blobs before deleting the comment", async () => {
      const comment = makeComment({ userId: "user-1" });
      const attachments = [
        makeCommentAttachment({ id: "att-1", url: "https://public.blob.vercel-storage.com/photo1.jpg" }),
        makeCommentAttachment({ id: "att-2", url: "https://public.blob.vercel-storage.com/photo2.jpg" }),
      ];
      const deps = makeDeps({
        commentRepository: {
          findById: vi.fn().mockResolvedValue(comment),
          delete: vi.fn().mockResolvedValue(undefined),
        },
        commentAttachmentRepository: {
          findByComment: vi.fn().mockResolvedValue(attachments),
        },
      });

      await deleteComment({ commentId: "comment-1", userId: "user-1" }, deps);

      expect(deps.storage.delete).toHaveBeenCalledTimes(2);
      expect(deps.storage.delete).toHaveBeenCalledWith(attachments[0].url);
      expect(deps.storage.delete).toHaveBeenCalledWith(attachments[1].url);
      expect(deps.commentRepository.delete).toHaveBeenCalledWith("comment-1");
    });

    it("should still delete comment even if blob deletion fails (best-effort)", async () => {
      const comment = makeComment({ userId: "user-1" });
      const attachments = [
        makeCommentAttachment({ id: "att-1", url: "https://public.blob.vercel-storage.com/photo1.jpg" }),
      ];
      const deps = makeDeps({
        commentRepository: {
          findById: vi.fn().mockResolvedValue(comment),
          delete: vi.fn().mockResolvedValue(undefined),
        },
        commentAttachmentRepository: {
          findByComment: vi.fn().mockResolvedValue(attachments),
        },
        storage: {
          delete: vi.fn().mockRejectedValue(new Error("Blob service down")),
        },
      });

      await deleteComment({ commentId: "comment-1", userId: "user-1" }, deps);

      expect(deps.commentRepository.delete).toHaveBeenCalledWith("comment-1");
    });

    it("should delete blobs in parallel", async () => {
      const comment = makeComment({ userId: "user-1" });
      const callOrder: string[] = [];
      const attachments = [
        makeCommentAttachment({ id: "att-1" }),
        makeCommentAttachment({ id: "att-2" }),
      ];
      const deps = makeDeps({
        commentRepository: {
          findById: vi.fn().mockResolvedValue(comment),
          delete: vi.fn().mockResolvedValue(undefined),
        },
        commentAttachmentRepository: {
          findByComment: vi.fn().mockResolvedValue(attachments),
        },
        storage: {
          delete: vi.fn().mockImplementation(async () => {
            callOrder.push("delete-start");
            await new Promise((r) => setTimeout(r, 10));
            callOrder.push("delete-end");
          }),
        },
      });

      await deleteComment({ commentId: "comment-1", userId: "user-1" }, deps);

      expect(callOrder[0]).toBe("delete-start");
      expect(callOrder[1]).toBe("delete-start");
    });
  });

  describe("given a comment without attachments", () => {
    it("should skip blob cleanup and just delete the comment", async () => {
      const comment = makeComment({ userId: "user-1" });
      const deps = makeDeps({
        commentRepository: {
          findById: vi.fn().mockResolvedValue(comment),
          delete: vi.fn().mockResolvedValue(undefined),
        },
        commentAttachmentRepository: {
          findByComment: vi.fn().mockResolvedValue([]),
        },
      });

      await deleteComment({ commentId: "comment-1", userId: "user-1" }, deps);

      expect(deps.storage.delete).not.toHaveBeenCalled();
      expect(deps.commentRepository.delete).toHaveBeenCalledWith("comment-1");
    });
  });
});

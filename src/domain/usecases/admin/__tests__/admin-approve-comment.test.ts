import { describe, it, expect, vi } from "vitest";
import { adminApproveComment } from "@/domain/usecases/admin/admin-approve-comment";
import {
  createMockCommentRepository,
  makeComment,
} from "@/domain/usecases/__tests__/helpers/mock-comment-repository";
import { CommentNotFoundError } from "@/domain/errors";

describe("adminApproveComment", () => {
  it("should set a pending comment to PUBLISHED and report wasPending=true (for broadcast)", async () => {
    const pending = makeComment({
      id: "c1",
      status: "PENDING_REVIEW",
      momentId: "m1",
      userId: "u1",
      content: "Coucou",
    });
    const commentRepository = createMockCommentRepository({
      findById: vi.fn().mockResolvedValue(pending),
    });

    const result = await adminApproveComment(
      { commentId: "c1" },
      { commentRepository }
    );

    expect(commentRepository.updateStatus).toHaveBeenCalledWith(
      "c1",
      "PUBLISHED"
    );
    expect(result.wasPending).toBe(true);
    expect(result.comment.status).toBe("PUBLISHED");
    expect(result.comment.momentId).toBe("m1");
    expect(result.comment.userId).toBe("u1");
    expect(result.comment.content).toBe("Coucou");
  });

  it("should be a no-op for an already-published comment (no re-broadcast)", async () => {
    const published = makeComment({ id: "c2", status: "PUBLISHED" });
    const commentRepository = createMockCommentRepository({
      findById: vi.fn().mockResolvedValue(published),
    });

    const result = await adminApproveComment(
      { commentId: "c2" },
      { commentRepository }
    );

    expect(result.wasPending).toBe(false);
    expect(commentRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("should throw CommentNotFoundError when the comment does not exist", async () => {
    const commentRepository = createMockCommentRepository({
      findById: vi.fn().mockResolvedValue(null),
    });

    await expect(
      adminApproveComment({ commentId: "missing" }, { commentRepository })
    ).rejects.toThrow(CommentNotFoundError);
    expect(commentRepository.updateStatus).not.toHaveBeenCalled();
  });
});

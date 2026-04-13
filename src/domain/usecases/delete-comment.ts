import type { CommentRepository } from "@/domain/ports/repositories/comment-repository";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { CommentAttachmentRepository } from "@/domain/ports/repositories/comment-attachment-repository";
import type { StorageService } from "@/domain/ports/services/storage-service";
import {
  CommentNotFoundError,
  UnauthorizedCommentDeletionError,
} from "@/domain/errors";

type DeleteCommentInput = {
  commentId: string;
  userId: string;
};

type DeleteCommentDeps = {
  commentRepository: CommentRepository;
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
  commentAttachmentRepository?: CommentAttachmentRepository;
  storage?: StorageService;
};

export async function deleteComment(
  input: DeleteCommentInput,
  deps: DeleteCommentDeps
): Promise<void> {
  const { commentRepository, momentRepository, circleRepository } = deps;

  const comment = await commentRepository.findById(input.commentId);
  if (!comment) {
    throw new CommentNotFoundError(input.commentId);
  }

  // Check authorization: author or host can delete
  const isAuthor = comment.userId === input.userId;
  if (!isAuthor) {
    const moment = await momentRepository.findById(comment.momentId);
    if (!moment) {
      throw new UnauthorizedCommentDeletionError();
    }
    const membership = await circleRepository.findMembership(
      moment.circleId,
      input.userId
    );
    if (membership?.role !== "HOST") {
      throw new UnauthorizedCommentDeletionError();
    }
  }

  // Best-effort blob cleanup before DB deletion
  if (deps.commentAttachmentRepository && deps.storage) {
    const attachments = await deps.commentAttachmentRepository.findByComment(
      input.commentId
    );
    await Promise.all(
      attachments.map((att) =>
        deps.storage!.delete(att.url).catch(() => {
          console.error(
            `Failed to delete blob for comment attachment ${att.id}`
          );
        })
      )
    );
  }

  // Cascade on Comment deletes CommentAttachment rows automatically
  await commentRepository.delete(input.commentId);
}

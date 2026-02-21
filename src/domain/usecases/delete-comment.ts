import type { CommentRepository } from "@/domain/ports/repositories/comment-repository";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
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

  // Author can always delete their own comment
  if (comment.userId === input.userId) {
    await commentRepository.delete(input.commentId);
    return;
  }

  // A Host of the Circle that owns the Moment can delete any comment
  const moment = await momentRepository.findById(comment.momentId);
  if (moment) {
    const membership = await circleRepository.findMembership(
      moment.circleId,
      input.userId
    );
    if (membership?.role === "HOST") {
      await commentRepository.delete(input.commentId);
      return;
    }
  }

  throw new UnauthorizedCommentDeletionError();
}

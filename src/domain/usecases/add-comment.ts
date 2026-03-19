import type { Comment } from "@/domain/models/comment";
import type { CommentRepository } from "@/domain/ports/repositories/comment-repository";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import {
  MomentNotFoundError,
  CommentContentEmptyError,
  CommentContentTooLongError,
} from "@/domain/errors";

const MAX_COMMENT_LENGTH = 2000;

type AddCommentInput = {
  momentId: string;
  userId: string;
  content: string;
};

type AddCommentDeps = {
  commentRepository: CommentRepository;
  momentRepository: MomentRepository;
  registrationRepository?: RegistrationRepository;
};

type AddCommentResult = {
  comment: Comment;
};

export async function addComment(
  input: AddCommentInput,
  deps: AddCommentDeps
): Promise<AddCommentResult> {
  const { commentRepository, momentRepository } = deps;

  const trimmed = input.content.trim();

  if (trimmed.length === 0) {
    throw new CommentContentEmptyError();
  }

  if (trimmed.length > MAX_COMMENT_LENGTH) {
    throw new CommentContentTooLongError(MAX_COMMENT_LENGTH);
  }

  const moment = await momentRepository.findById(input.momentId);
  if (!moment) {
    throw new MomentNotFoundError(input.momentId);
  }

  // D11: block comments from users with PENDING_APPROVAL registration
  if (deps.registrationRepository) {
    const registration = await deps.registrationRepository.findByMomentAndUser(
      input.momentId,
      input.userId
    );
    if (registration?.status === "PENDING_APPROVAL") {
      throw new MomentNotFoundError(input.momentId);
    }
  }

  const comment = await commentRepository.create({
    momentId: input.momentId,
    userId: input.userId,
    content: trimmed,
  });

  return { comment };
}

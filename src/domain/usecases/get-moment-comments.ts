import type { CommentWithUser } from "@/domain/models/comment";
import type { CommentRepository } from "@/domain/ports/repositories/comment-repository";

type GetMomentCommentsInput = {
  momentId: string;
  /**
   * Utilisateur courant : voit ses propres commentaires en attente de
   * validation (en plus des PUBLISHED visibles par tous). Absent → PUBLISHED
   * uniquement.
   */
  viewerId?: string;
};

type GetMomentCommentsDeps = {
  commentRepository: CommentRepository;
};

export async function getMomentComments(
  input: GetMomentCommentsInput,
  deps: GetMomentCommentsDeps
): Promise<CommentWithUser[]> {
  return deps.commentRepository.findByMomentIdWithUser(
    input.momentId,
    input.viewerId
  );
}

import type { Comment } from "@/domain/models/comment";
import type { CommentRepository } from "@/domain/ports/repositories/comment-repository";
import { CommentNotFoundError } from "@/domain/errors";

type AdminApproveCommentInput = {
  commentId: string;
};

type AdminApproveCommentDeps = {
  commentRepository: CommentRepository;
};

/**
 * Modération admin : passe un commentaire en attente à PUBLISHED. Retourne le
 * commentaire (avec momentId/userId/content) pour permettre à l'action de
 * déclencher le broadcast aux participants au moment de l'approbation.
 */
export async function adminApproveComment(
  input: AdminApproveCommentInput,
  deps: AdminApproveCommentDeps
): Promise<Comment> {
  const comment = await deps.commentRepository.findById(input.commentId);
  if (!comment) {
    throw new CommentNotFoundError(input.commentId);
  }
  await deps.commentRepository.updateStatus(input.commentId, "PUBLISHED");
  return { ...comment, status: "PUBLISHED" };
}

import type { Comment } from "@/domain/models/comment";
import type { CommentRepository } from "@/domain/ports/repositories/comment-repository";
import { CommentNotFoundError } from "@/domain/errors";

type AdminApproveCommentInput = {
  commentId: string;
};

type AdminApproveCommentDeps = {
  commentRepository: CommentRepository;
};

type AdminApproveCommentResult = {
  comment: Comment;
  /**
   * Vrai si le commentaire était réellement en attente avant l'appel. Permet à
   * l'action de ne broadcaster aux participants QUE lors d'une vraie première
   * approbation — ré-approuver un commentaire déjà publié est un no-op (évite un
   * double email de masse).
   */
  wasPending: boolean;
};

/**
 * Modération admin : passe un commentaire en attente à PUBLISHED. Idempotent :
 * si le commentaire est déjà publié, n'écrit rien et signale `wasPending: false`.
 */
export async function adminApproveComment(
  input: AdminApproveCommentInput,
  deps: AdminApproveCommentDeps
): Promise<AdminApproveCommentResult> {
  const comment = await deps.commentRepository.findById(input.commentId);
  if (!comment) {
    throw new CommentNotFoundError(input.commentId);
  }
  const wasPending = comment.status === "PENDING_REVIEW";
  if (wasPending) {
    await deps.commentRepository.updateStatus(input.commentId, "PUBLISHED");
  }
  return { comment: { ...comment, status: "PUBLISHED" }, wasPending };
}

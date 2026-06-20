import type {
  Comment,
  CommentStatus,
  CommentWithUser,
} from "@/domain/models/comment";

export type CreateCommentInput = {
  momentId: string;
  userId: string;
  content: string;
  /** Défaut PUBLISHED si non fourni (comportement historique). */
  status?: CommentStatus;
};

export interface CommentRepository {
  create(input: CreateCommentInput): Promise<Comment>;
  findById(id: string): Promise<Comment | null>;
  /**
   * Commentaires d'un événement pour l'affichage public. Renvoie les PUBLISHED
   * pour tous, plus les PENDING_REVIEW de `viewerId` (l'auteur voit son propre
   * commentaire en attente). Sans `viewerId` → PUBLISHED uniquement.
   */
  findByMomentIdWithUser(
    momentId: string,
    viewerId?: string
  ): Promise<CommentWithUser[]>;
  delete(id: string): Promise<void>;
  /** Nombre de commentaires PUBLISHED (compteur public). */
  countByMomentId(momentId: string): Promise<number>;
  /** Modération : passe un commentaire à un autre statut (ex. approbation). */
  updateStatus(id: string, status: CommentStatus): Promise<void>;
}

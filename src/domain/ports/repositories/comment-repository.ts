import type { Comment, CommentWithUser } from "@/domain/models/comment";

export type CreateCommentInput = {
  momentId: string;
  userId: string;
  content: string;
};

export interface CommentRepository {
  create(input: CreateCommentInput): Promise<Comment>;
  findById(id: string): Promise<Comment | null>;
  findByMomentIdWithUser(momentId: string): Promise<CommentWithUser[]>;
  delete(id: string): Promise<void>;
  countByMomentId(momentId: string): Promise<number>;
}

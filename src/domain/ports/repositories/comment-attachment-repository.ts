import type { CommentAttachment } from "@/domain/models/comment-attachment";

export type CreateCommentAttachmentInput = {
  commentId: string;
  url: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export interface CommentAttachmentRepository {
  create(input: CreateCommentAttachmentInput): Promise<CommentAttachment>;
  findByComment(commentId: string): Promise<CommentAttachment[]>;
  deleteByComment(commentId: string): Promise<void>;
}

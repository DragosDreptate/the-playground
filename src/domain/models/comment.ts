import type { CommentAttachment } from "./comment-attachment";

export type CommentStatus = "PUBLISHED" | "PENDING_REVIEW";

export type Comment = {
  id: string;
  momentId: string;
  userId: string;
  content: string;
  status: CommentStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type CommentWithUser = Comment & {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    image: string | null;
  };
  attachments: CommentAttachment[];
};

export type CommentAttachment = {
  id: string;
  commentId: string;
  url: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: Date;
};

export const MAX_COMMENT_PHOTOS = 3;
export const MAX_COMMENT_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const CLIENT_COMPRESS_THRESHOLD_BYTES = 3 * 1024 * 1024; // 3 MB

export const ALLOWED_COMMENT_PHOTO_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

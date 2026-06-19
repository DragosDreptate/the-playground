export type MomentAttachment = {
  id: string;
  momentId: string;
  url: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: Date;
};

export const MAX_ATTACHMENTS_PER_MOMENT = 3;

/** Documents and images (PDF/JPG/PNG/WEBP). */
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
/** Videos (MP4/MOV/WEBM) — heavier, so a higher cap. */
export const MAX_VIDEO_ATTACHMENT_SIZE_BYTES = 30 * 1024 * 1024; // 30 MB

export const ALLOWED_ATTACHMENT_CONTENT_TYPES: ReadonlySet<string> = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime", // .mov (iPhone default)
  "video/webm",
]);

export function isVideoContentType(contentType: string): boolean {
  return contentType.startsWith("video/");
}

/**
 * Size cap for a given content type. Videos get the larger cap, everything
 * else (documents, images) the standard one. Single source of truth reused
 * by the client validation, the upload token route and the usecase.
 */
export function maxSizeForContentType(contentType: string): number {
  return isVideoContentType(contentType)
    ? MAX_VIDEO_ATTACHMENT_SIZE_BYTES
    : MAX_ATTACHMENT_SIZE_BYTES;
}

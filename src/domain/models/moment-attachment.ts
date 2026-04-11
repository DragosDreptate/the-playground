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
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_ATTACHMENT_CONTENT_TYPES: ReadonlySet<string> = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function isImageAttachment(contentType: string): boolean {
  return contentType.startsWith("image/");
}

export function isPdfAttachment(contentType: string): boolean {
  return contentType === "application/pdf";
}

/**
 * Format bytes as "X KB" or "X,Y MB" (French decimal separator).
 */
export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    const kb = Math.round(bytes / 1024);
    return `${kb} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1).replace(".", ",")} MB`;
}

/**
 * Format a content type for display: "PDF", "JPG", "PNG", "WEBP", or fallback.
 */
export function formatAttachmentType(contentType: string): string {
  switch (contentType) {
    case "application/pdf":
      return "PDF";
    case "image/jpeg":
      return "JPG";
    case "image/png":
      return "PNG";
    case "image/webp":
      return "WEBP";
    default:
      return contentType;
  }
}

/**
 * Display name: original filename without the extension.
 */
export function formatAttachmentName(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot <= 0) return filename;
  return filename.substring(0, lastDot);
}

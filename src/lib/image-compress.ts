import { CLIENT_COMPRESS_THRESHOLD_BYTES } from "@/domain/models/comment-attachment";

/**
 * Compresses a comment photo if it exceeds the 3 MB threshold.
 * Unlike resizeImage() (square centre-crop for avatars/covers),
 * this function preserves the original aspect ratio.
 *
 * - File <= 3 MB → returned as-is (no transformation)
 * - File > 3 MB  → scaled down (longest side = 1920px), 0.8 quality, WebP
 * - Aspect ratio is ALWAYS preserved (no crop)
 * - Typical result: 12 MB iPhone photo → ~200-400 KB WebP at 1920px
 */
export async function compressCommentPhoto(file: File): Promise<Blob> {
  if (file.size <= CLIENT_COMPRESS_THRESHOLD_BYTES) {
    return file;
  }

  const maxDimension = 1920;
  const quality = 0.8;
  const format = "image/webp";

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { naturalWidth: w, naturalHeight: h } = img;

      // Scale down: longest side → maxDimension, ratio preserved
      let targetW = w;
      let targetH = h;
      if (w > maxDimension || h > maxDimension) {
        if (w >= h) {
          targetW = maxDimension;
          targetH = Math.round(h * (maxDimension / w));
        } else {
          targetH = maxDimension;
          targetW = Math.round(w * (maxDimension / h));
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }

      ctx.drawImage(img, 0, 0, targetW, targetH);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback to JPEG if WebP is not supported
            canvas.toBlob(
              (fallbackBlob) => {
                if (fallbackBlob) {
                  resolve(fallbackBlob);
                } else {
                  reject(new Error("Image export failed"));
                }
              },
              "image/jpeg",
              quality
            );
          }
        },
        format,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image load failed"));
    };

    img.src = objectUrl;
  });
}

type ResizeOptions = {
  /** Target size in pixels (square). Default: 384 */
  maxSize?: number;
  /** Export quality 0–1. Default: 0.8 */
  quality?: number;
  /** Preferred MIME type. Falls back to "image/jpeg" if unsupported. Default: "image/webp" */
  format?: string;
};

/**
 * Resizes an image file to a square (centre-cropped) using the Canvas API.
 *
 * - Accepts any browser-supported image format (JPEG, PNG, WebP, GIF, …)
 * - Crops to a centred square before scaling
 * - Exports as WebP (fallback JPEG) at the requested quality
 * - Typical result: ~20–50 KB for a 384×384 avatar
 *
 * @param file    Source image file from an <input type="file"> element
 * @param options Resize options (maxSize, quality, format)
 * @returns       A Blob ready to be uploaded
 */
export async function resizeImage(
  file: File,
  options: ResizeOptions = {}
): Promise<Blob> {
  const { maxSize = 384, quality = 0.8, format = "image/webp" } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const { naturalWidth: w, naturalHeight: h } = img;

      // Centre-crop to a square
      const side = Math.min(w, h);
      const sx = (w - side) / 2;
      const sy = (h - side) / 2;

      // Draw at target size
      const canvas = document.createElement("canvas");
      canvas.width = maxSize;
      canvas.height = maxSize;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }

      ctx.drawImage(img, sx, sy, side, side, 0, 0, maxSize, maxSize);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback to JPEG if the preferred format is not supported
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

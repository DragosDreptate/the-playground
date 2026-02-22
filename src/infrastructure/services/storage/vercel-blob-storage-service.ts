import { put, del } from "@vercel/blob";
import type { StorageService } from "@/domain/ports/services/storage-service";
import { isUploadedUrl } from "@/lib/blob";

export const vercelBlobStorageService: StorageService = {
  async upload(path, file, contentType) {
    const { url } = await put(path, file, {
      access: "public",
      contentType,
    });
    return url;
  },

  async delete(url) {
    // Only delete blobs that were uploaded via Vercel Blob.
    // OAuth avatar URLs (Google, GitHub) must not be deleted.
    if (!isUploadedUrl(url)) return;
    await del(url);
  },
};

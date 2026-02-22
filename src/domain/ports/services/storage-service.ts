// --- Port interface ---

export interface StorageService {
  /**
   * Uploads a file and returns its public URL.
   * @param path - The storage path/key (e.g. "avatars/user-123.webp")
   * @param file - The file content as a Buffer or Blob
   * @param contentType - MIME type (e.g. "image/webp")
   */
  upload(path: string, file: Buffer | Blob, contentType: string): Promise<string>;

  /**
   * Deletes a file by its public URL.
   * No-op if the URL is not a managed blob (e.g. OAuth avatar URL).
   */
  delete(url: string): Promise<void>;
}

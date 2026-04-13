/**
 * Sanitizes a filename for safe storage and URL usage.
 * - Strips diacritics (NFD decomposition)
 * - Replaces non-ASCII / special characters with hyphens
 * - Trims leading/trailing hyphens
 * - Lowercases the result
 * - Falls back to "file" if nothing remains
 */
export function sanitizeFilename(filename: string): string {
  const ascii = filename.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const safe = ascii
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return safe.length > 0 ? safe : "file";
}

export function generateSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Validates that a slug matches the format produced by generateSlug.
 * Rejects URLs, encoded characters, and other invalid patterns
 * before they hit the database.
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length > 120) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

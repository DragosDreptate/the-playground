/**
 * Escapes a string for safe inclusion in HTML markup (text or attribute value).
 * Covers the five reserved characters required by the HTML5 spec.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

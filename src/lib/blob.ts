/**
 * Determines whether a URL points to a Vercel Blob-uploaded file
 * (as opposed to an OAuth provider avatar URL from Google/GitHub).
 *
 * Vercel Blob URLs always contain "public.blob.vercel-storage.com".
 */
export function isUploadedUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("public.blob.vercel-storage.com");
}

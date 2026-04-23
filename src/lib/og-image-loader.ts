import sharp from "sharp";

/**
 * Satori (le moteur derrière `next/og`) ne sait pas décoder le WebP.
 * Comme nos covers sont uploadées en WebP, on doit les re-encoder en PNG
 * avant de les passer au composant JSX de l'OG image. On renvoie une data URL
 * inlinable, et null en cas d'échec (le caller retombe alors sur un fallback).
 */
export async function loadOgCoverAsDataUrl(
  url: string
): Promise<string | null> {
  try {
    const response = await fetch(url, {
      cache: "force-cache",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    const buffer = Buffer.from(await response.arrayBuffer());

    const needsConversion = contentType.includes("webp");
    const output = needsConversion
      ? await sharp(buffer).png().toBuffer()
      : buffer;
    const mime = needsConversion
      ? "image/png"
      : contentType.split(";")[0] || "image/png";

    return `data:${mime};base64,${output.toString("base64")}`;
  } catch {
    return null;
  }
}

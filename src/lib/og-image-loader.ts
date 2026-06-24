import sharp from "sharp";

const OG_COVER_SIZE = 1200;

/**
 * Charge la cover et la renvoie comme JPEG carré 1200×1200 directement
 * servable en og:image — sans aucune composition (pas de pill, pas de Satori).
 *
 * - `flatten` sur blanc : les covers PNG/WebP transparentes (logos conçus pour
 *   fond clair) seraient illisibles sinon. Aucun effet sur les covers opaques.
 * - JPEG q82 : indispensable pour le poids — WhatsApp n'affiche pas les images
 *   trop lourdes (le PNG 1200×1200 d'origine pesait ~1 Mo et était ignoré).
 *
 * Renvoie null en cas d'échec → le caller retombe sur le fallback gradient.
 */
export async function loadCoverAsOgJpeg(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      cache: "force-cache",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    return await sharp(buffer)
      .resize(OG_COVER_SIZE, OG_COVER_SIZE, { fit: "cover" })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch {
    return null;
  }
}

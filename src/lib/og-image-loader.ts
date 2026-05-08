import sharp from "sharp";

const OG_COVER_SIZE = 1200;

/**
 * Charge la cover, la re-encode systématiquement en JPEG q80 redimensionné à
 * 1200×1200 puis la renvoie comme data URL inlinable.
 *
 * Pourquoi forcer JPEG + resize :
 * - Satori (next/og) ne sait pas décoder le WebP — il faut convertir.
 * - Inliner une cover originale (souvent 1080–4000 px, parfois en PNG)
 *   gonfle la réponse de plusieurs centaines de Ko et fait travailler Satori
 *   pour rien. On la cale au format de la canvas (1200×1200).
 * - La cover est toujours rendue derrière un scrim noir 55% → JPEG q80 est
 *   visuellement indiscernable du PNG et ~5–10× plus léger.
 *
 * Renvoie null en cas d'échec : le caller retombe sur un fallback gradient.
 */
export async function loadOgCoverAsDataUrl(
  url: string,
): Promise<string | null> {
  try {
    const response = await fetch(url, {
      cache: "force-cache",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    const output = await sharp(buffer)
      .resize(OG_COVER_SIZE, OG_COVER_SIZE, { fit: "cover" })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    return `data:image/jpeg;base64,${output.toString("base64")}`;
  } catch {
    return null;
  }
}

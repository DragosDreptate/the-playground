import { ImageResponse } from "next/og";
import sharp from "sharp";
import type { ReactElement } from "react";

type OgImageOptions = ConstructorParameters<typeof ImageResponse>[1];

// 1h frais puis 1 semaine de stale-while-revalidate : le CDN sert l'image
// instantanément aux crawlers sociaux (plus de timeout sur une génération à
// froid) et la rafraîchit en arrière-plan si la cover change.
const CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=604800";

/**
 * Rend une image OG et la renvoie en JPEG compressé.
 *
 * Pourquoi ne pas renvoyer directement l'ImageResponse :
 * next/og (Satori + resvg) n'encode qu'en PNG. Pour une image qui contient une
 * cover photo plein cadre, ce PNG pèse 0,5 à 4 Mo, au-dessus de la limite
 * d'affichage des crawlers (WhatsApp ne génère plus de preview au-delà de
 * ~300 Ko, Slack a aussi un plafond) : l'aperçu reste alors vide.
 * On re-encode donc le PNG en JPEG q82 (~150-250 Ko, visuellement identique).
 *
 * Toute route opengraph-image doit exporter `contentType = "image/jpeg"`.
 */
export async function renderOgImage(
  element: ReactElement,
  options: OgImageOptions,
): Promise<Response> {
  const png = new ImageResponse(element, options);
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  return new Response(new Uint8Array(jpeg), {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": CACHE_CONTROL,
    },
  });
}

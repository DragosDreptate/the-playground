import { ImageResponse } from "next/og";
import sharp from "sharp";
import type { ReactElement } from "react";

// 1h frais + 1 jour de stale-while-revalidate : le CDN sert vite aux crawlers
// (pas de régénération à froid au premier partage) et propage un changement de
// cover sous 1h. On ne pose PAS de Content-Length (l'ImageResponse natif de
// l'état stable n'en posait pas non plus, et le poser fait tronquer la réponse
// sur les requêtes Range de Slack).
const CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";

// Options JPEG communes aux og:image (cover et fallback) — q82 mozjpeg : poids
// minimal pour passer sous la limite d'affichage de WhatsApp.
export const OG_JPEG_OPTIONS = { quality: 82, mozjpeg: true } as const;

function jpegResponse(buffer: Buffer): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": CACHE_CONTROL,
    },
  });
}

/**
 * Sert un buffer JPEG déjà prêt (cas cover : la cover brute aplatie sur blanc).
 */
export function ogJpegResponse(buffer: Buffer): Response {
  return jpegResponse(buffer);
}

/**
 * Rend un élément Satori (cas fallback sans cover : gradient + texte) puis le
 * re-encode en JPEG, pour un `content-type` cohérent (image/jpeg) avec le cas
 * cover et un poids léger. next/og n'encode qu'en PNG, d'où le passage sharp.
 *
 * Si le re-encodage JPEG échoue, on sert le PNG brut plutôt qu'un 500 : une
 * image reste préférable à pas d'aperçu du tout.
 */
export async function ogFallbackResponse(
  element: ReactElement,
  options: ConstructorParameters<typeof ImageResponse>[1],
): Promise<Response> {
  const png = new ImageResponse(element, options);
  const pngBuffer = Buffer.from(await png.arrayBuffer());

  try {
    const jpeg = await sharp(pngBuffer).jpeg(OG_JPEG_OPTIONS).toBuffer();
    return jpegResponse(jpeg);
  } catch {
    return new Response(new Uint8Array(pngBuffer), {
      headers: {
        "content-type": "image/png",
        "cache-control": CACHE_CONTROL,
      },
    });
  }
}

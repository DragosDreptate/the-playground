import { ImageResponse } from "next/og";
import sharp from "sharp";
import type { ReactElement } from "react";

type OgImageOptions = ConstructorParameters<typeof ImageResponse>[1];

// 1h frais puis 1 jour de stale-while-revalidate : le CDN sert l'image
// instantanément aux crawlers sociaux (plus de timeout sur une génération à
// froid) et la rafraîchit en arrière-plan. La fenêtre est volontairement
// courte pour qu'un changement de cover se propage vite dans les aperçus.
const CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";

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
 * Si le re-encodage échoue, on sert le PNG brut plutôt qu'un aperçu vide :
 * une image lourde reste préférable à pas d'image du tout.
 *
 * NE PAS poser de `Content-Length`. Le proxy d'image de Slack récupère l'image
 * avec `Range: bytes=0-32768` (32 Ko, le plus strict des crawlers). Si la
 * réponse porte un Content-Length, le CDN Vercel honore le Range et renvoie un
 * `200` (et non un `206`) tronqué aux 32 premiers Ko : Slack croit tenir
 * l'image entière mais n'en a qu'un tiers → aperçu vide pour toute image
 * > 32 Ko (typiquement dès qu'il y a une cover). Sans Content-Length, le CDN ne
 * peut pas tronquer et sert le corps complet en 200, que Slack consomme bien
 * (comme WhatsApp et les fetch directs).
 *
 * Toute route opengraph-image doit exporter `contentType = "image/jpeg"`.
 */
export async function renderOgImage(
  element: ReactElement,
  options: OgImageOptions,
): Promise<Response> {
  const png = new ImageResponse(element, options);
  const pngBuffer = Buffer.from(await png.arrayBuffer());

  try {
    const jpeg = await sharp(pngBuffer)
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    // La copie en Uint8Array fournit le ArrayBuffer (non partagé) exigé par
    // le type BodyInit ; le coût est négligeable face au rendu qui précède.
    return new Response(new Uint8Array(jpeg), {
      headers: {
        "content-type": "image/jpeg",
        "cache-control": CACHE_CONTROL,
      },
    });
  } catch {
    return new Response(new Uint8Array(pngBuffer), {
      headers: {
        "content-type": "image/png",
        "cache-control": CACHE_CONTROL,
      },
    });
  }
}

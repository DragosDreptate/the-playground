import { getTranslations } from "next-intl/server";
import { prismaCircleRepository } from "@/infrastructure/repositories";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { CircleNotFoundError } from "@/domain/errors";
import { getMomentGradient } from "@/lib/gradient";
import { loadCoverAsOgJpeg } from "@/lib/og-image-loader";
import { ogJpegResponse, ogFallbackResponse } from "@/lib/og/render";
import { truncate } from "@/lib/text";
import { OgFallbackFrame } from "@/lib/og/components";

export const runtime = "nodejs";
export const alt = "Community — The Playground";
export const size = { width: 1200, height: 1200 };
export const contentType = "image/jpeg";

const NAME_MAX = 50;
const META_MAX = 56;

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;

  let circle;
  try {
    circle = await getCircleBySlug(slug, {
      circleRepository: prismaCircleRepository,
    });
  } catch (error) {
    if (error instanceof CircleNotFoundError) {
      return new Response("Not found", { status: 404 });
    }
    throw error;
  }

  // Pas de gate sur la visibilité ici : un Circle privé reste accessible par
  // lien direct (partage), et son aperçu social doit s'afficher comme celui d'un
  // Circle public. La règle « privé » agit sur l'indexation crawler (robots) et
  // l'affichage Explorer, pas sur la génération de l'image de partage. Même
  // pattern que la route OG de /m/[slug] (aucun gate de visibilité).
  const coverJpeg = circle.coverImage
    ? await loadCoverAsOgJpeg(circle.coverImage)
    : null;

  if (coverJpeg) {
    return ogJpegResponse(coverJpeg);
  }

  // Pas de cover → fallback content-rich : titre et meta dans l'image.
  const [memberCount, t] = await Promise.all([
    prismaCircleRepository.countMembers(circle.id),
    getTranslations({ locale, namespace: "Explorer.circleCard" }),
  ]);
  const memberLabel = t("members", { count: memberCount });
  const metaText = circle.city ? `${memberLabel} · ${circle.city}` : memberLabel;

  return ogFallbackResponse(
    (
      <OgFallbackFrame gradient={getMomentGradient(circle.id)}>
        <div
          style={{
            position: "absolute",
            left: 56,
            right: 56,
            bottom: 56,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "white",
              lineHeight: 1.06,
              letterSpacing: "-1.7px",
              display: "flex",
            }}
          >
            {truncate(circle.name, NAME_MAX)}
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 500,
              color: "rgba(255, 255, 255, 0.78)",
              marginTop: 18,
              display: "flex",
            }}
          >
            {truncate(metaText, META_MAX)}
          </div>
        </div>
      </OgFallbackFrame>
    ),
    { ...size },
  );
}

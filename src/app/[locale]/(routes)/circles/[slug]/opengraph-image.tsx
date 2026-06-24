import { getTranslations } from "next-intl/server";
import { prismaCircleRepository } from "@/infrastructure/repositories";
import { renderOgImage } from "@/lib/og/render";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { CircleNotFoundError } from "@/domain/errors";
import { getMomentGradient } from "@/lib/gradient";
import { loadOgCoverAsDataUrl } from "@/lib/og-image-loader";
import { truncate } from "@/lib/text";
import {
  OG_COLORS,
  OgBrandingPill,
  OgCoverBackground,
  OgPureCoverLayout,
} from "@/lib/og/components";

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

  if (circle.visibility !== "PUBLIC") {
    return new Response("Not found", { status: 404 });
  }

  const coverDataUrl = circle.coverImage
    ? await loadOgCoverAsDataUrl(circle.coverImage)
    : null;

  if (coverDataUrl) {
    return renderOgImage(<OgPureCoverLayout coverDataUrl={coverDataUrl} />, {
      ...size,
    });
  }

  // Pas de cover → fallback content-rich : titre et meta dans l'image.
  const [memberCount, t] = await Promise.all([
    prismaCircleRepository.countMembers(circle.id),
    getTranslations({ locale, namespace: "Explorer.circleCard" }),
  ]);
  const memberLabel = t("members", { count: memberCount });
  const metaText = circle.city ? `${memberLabel} · ${circle.city}` : memberLabel;

  return renderOgImage(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: OG_COLORS.bgDark,
        }}
      >
        <OgCoverBackground
          coverDataUrl={null}
          gradient={getMomentGradient(circle.id)}
        />
        <OgBrandingPill />

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
      </div>
    ),
    { ...size },
  );
}

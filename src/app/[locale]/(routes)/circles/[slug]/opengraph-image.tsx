import { ImageResponse } from "next/og";
import { prismaCircleRepository } from "@/infrastructure/repositories";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { CircleNotFoundError } from "@/domain/errors";
import { getMomentGradient } from "@/lib/gradient";
import { loadOgCoverAsDataUrl } from "@/lib/og-image-loader";

export const runtime = "nodejs";
export const alt = "Community — The Playground";
export const size = { width: 1200, height: 1200 };
export const contentType = "image/png";

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

  const memberCount = await prismaCircleRepository.countMembers(circle.id);

  const truncatedName =
    circle.name.length > 50 ? circle.name.slice(0, 47) + "…" : circle.name;

  const memberLabel =
    locale === "fr"
      ? `${memberCount} membre${memberCount !== 1 ? "s" : ""}`
      : `${memberCount} member${memberCount !== 1 ? "s" : ""}`;
  const metaText = circle.city ? `${memberLabel} · ${circle.city}` : memberLabel;
  const truncatedMeta =
    metaText.length > 56 ? metaText.slice(0, 53) + "…" : metaText;

  const gradient = getMomentGradient(circle.id);
  const coverDataUrl = circle.coverImage
    ? await loadOgCoverAsDataUrl(circle.coverImage)
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#0c0a14",
        }}
      >
        {coverDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverDataUrl}
            alt=""
            width={size.width}
            height={size.height}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: gradient,
              display: "flex",
            }}
          />
        )}

        {/* Bottom scrim — gradient noir → transparent pour lisibilité du bloc info */}
        {coverDataUrl && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "55%",
              background:
                "linear-gradient(0deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0) 100%)",
              display: "flex",
            }}
          />
        )}

        {/* Branding pill — haut-droite */}
        <div
          style={{
            position: "absolute",
            top: 36,
            right: 36,
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(8, 6, 16, 0.55)",
            padding: "12px 20px",
            borderRadius: 999,
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: "linear-gradient(135deg, #ec4899, #a855f7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="16" viewBox="0 0 13 15" fill="none">
              <polygon points="0,0 0,15 13,7.5" fill="white" />
            </svg>
          </div>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "rgba(255, 255, 255, 0.5)",
                letterSpacing: "-0.5px",
              }}
            >
              {"the "}
            </span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#ff6097",
                letterSpacing: "-0.5px",
              }}
            >
              playground
            </span>
          </div>
        </div>

        {/* Bottom content : titre + meta */}
        <div
          style={{
            position: "absolute",
            left: 56,
            right: 56,
            bottom: 56,
            display: "flex",
            flexDirection: "column",
            alignItems: coverDataUrl ? "flex-start" : "center",
            textAlign: coverDataUrl ? "left" : "center",
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
            {truncatedName}
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
            {truncatedMeta}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

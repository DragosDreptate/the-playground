import { ImageResponse } from "next/og";
import { prismaCircleRepository } from "@/infrastructure/repositories";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { CircleNotFoundError } from "@/domain/errors";
import { getMomentGradient } from "@/lib/gradient";
import { loadOgCoverAsDataUrl } from "@/lib/og-image-loader";

export const runtime = "nodejs";
export const alt = "Community — The Playground";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COVER_SIZE = 630;
const CONTENT_WIDTH = size.width - COVER_SIZE;

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

  const description = circle.description
    ? circle.description.length > 160
      ? circle.description.slice(0, 157) + "..."
      : circle.description
    : "";

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
          flexDirection: "row",
          background: "linear-gradient(180deg, #0c0a14 0%, #1a1028 100%)",
          position: "relative",
        }}
      >
        {/* Top gradient bar, full width */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "linear-gradient(90deg, #ec4899, #a855f7, #ec4899)",
          }}
        />

        {/* Left: square cover (or gradient fallback) */}
        <div
          style={{
            width: COVER_SIZE,
            height: COVER_SIZE,
            display: "flex",
            flexShrink: 0,
            position: "relative",
          }}
        >
          {coverDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverDataUrl}
              alt=""
              width={COVER_SIZE}
              height={COVER_SIZE}
              style={{ width: COVER_SIZE, height: COVER_SIZE, objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: COVER_SIZE,
                height: COVER_SIZE,
                background: gradient,
              }}
            />
          )}
        </div>

        {/* Right: content */}
        <div
          style={{
            width: CONTENT_WIDTH,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            padding: "48px 48px 40px 44px",
          }}
        >
          {/* Community label */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "16px",
              fontWeight: 600,
              color: "#ec4899",
              textTransform: "uppercase",
              letterSpacing: "2px",
              marginBottom: "20px",
            }}
          >
            {locale === "fr" ? "Communauté" : "Community"}
          </div>

          {/* Circle name */}
          <div
            style={{
              fontSize: "44px",
              fontWeight: 700,
              color: "white",
              lineHeight: 1.15,
              letterSpacing: "-1px",
              marginBottom: "18px",
              display: "flex",
            }}
          >
            {circle.name.length > 60
              ? circle.name.slice(0, 57) + "..."
              : circle.name}
          </div>

          {/* Description */}
          {description && (
            <div
              style={{
                fontSize: "20px",
                color: "rgba(255, 255, 255, 0.65)",
                lineHeight: 1.45,
                flex: 1,
                display: "flex",
              }}
            >
              {description}
            </div>
          )}
          {!description && <div style={{ flex: 1 }} />}

          {/* Bottom info */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                maxWidth: CONTENT_WIDTH - 180,
              }}
            >
              {/* Members */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "20px",
                  color: "rgba(255, 255, 255, 0.8)",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {locale === "fr"
                  ? `${memberCount} membre${memberCount !== 1 ? "s" : ""}`
                  : `${memberCount} member${memberCount !== 1 ? "s" : ""}`}
              </div>

              {/* City */}
              {circle.city && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "18px",
                    color: "rgba(255, 255, 255, 0.6)",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {circle.city}
                </div>
              )}
            </div>

            {/* Bottom-right branding */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "28px",
                  borderRadius: "7px",
                  background: "linear-gradient(135deg, #ec4899, #a855f7)",
                }}
              >
                <svg width="11" height="13" viewBox="0 0 13 15" fill="none">
                  <polygon points="0,0 0,15 13,7.5" fill="white" />
                </svg>
              </div>
              <div style={{ display: "flex", alignItems: "baseline" }}>
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "rgba(255, 255, 255, 0.4)",
                    letterSpacing: "-0.4px",
                  }}
                >
                  {"the\u2009"}
                </span>
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#e8457a",
                    letterSpacing: "-0.4px",
                  }}
                >
                  playground
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

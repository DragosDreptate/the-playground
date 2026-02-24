import { ImageResponse } from "next/og";
import { prismaCircleRepository } from "@/infrastructure/repositories";
import { getCircleBySlug } from "@/domain/usecases/get-circle";
import { CircleNotFoundError } from "@/domain/errors";

export const runtime = "nodejs";
export const alt = "Community — The Playground";
export const size = { width: 1200, height: 630 };
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

  const description = circle.description
    ? circle.description.length > 120
      ? circle.description.slice(0, 117) + "..."
      : circle.description
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, #0c0a14 0%, #1a1028 100%)",
          padding: "48px 56px",
          position: "relative",
        }}
      >
        {/* Top gradient bar */}
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

        {/* Icon + Circle label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #ec4899, #a855f7)",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <span
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#ec4899",
              textTransform: "uppercase",
              letterSpacing: "2px",
            }}
          >
            {locale === "fr" ? "Communauté" : "Community"}
          </span>
        </div>

        {/* Circle name */}
        <div
          style={{
            fontSize: "52px",
            fontWeight: 700,
            color: "white",
            lineHeight: 1.15,
            letterSpacing: "-1px",
            marginBottom: "20px",
            maxWidth: "900px",
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
              fontSize: "22px",
              color: "rgba(255, 255, 255, 0.6)",
              lineHeight: 1.5,
              flex: 1,
              maxWidth: "800px",
            }}
          >
            {description}
          </div>
        )}

        {/* Bottom info */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          {/* Stats */}
          <div
            style={{
              display: "flex",
              gap: "32px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "20px",
                color: "rgba(255, 255, 255, 0.7)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
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
            {circle.city && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "20px",
                  color: "rgba(255, 255, 255, 0.7)",
                }}
              >
                <svg
                  width="20"
                  height="20"
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

          {/* Branding */}
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
    ),
    { ...size }
  );
}

import { ImageResponse } from "next/og";
import {
  prismaMomentRepository,
  prismaCircleRepository,
} from "@/infrastructure/repositories";
import { getMomentBySlug } from "@/domain/usecases/get-moment";
import { MomentNotFoundError } from "@/domain/errors";

export const runtime = "nodejs";
export const alt = "Escale — The Playground";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let moment;
  try {
    moment = await getMomentBySlug(slug, {
      momentRepository: prismaMomentRepository,
    });
  } catch (error) {
    if (error instanceof MomentNotFoundError) {
      return new Response("Not found", { status: 404 });
    }
    throw error;
  }

  if (moment.status === "CANCELLED") {
    return new Response("Not found", { status: 404 });
  }

  const circle = await prismaCircleRepository.findById(moment.circleId);

  const date = moment.startsAt.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = moment.startsAt.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const location =
    moment.locationType === "ONLINE"
      ? "En ligne"
      : moment.locationType === "HYBRID"
        ? "Hybride"
        : moment.locationName ?? moment.locationAddress ?? "";

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

        {/* Circle name */}
        {circle && (
          <div
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color: "#ec4899",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
            }}
          >
            {circle.name}
          </div>
        )}

        {/* Moment title */}
        <div
          style={{
            fontSize: "52px",
            fontWeight: 700,
            color: "white",
            lineHeight: 1.15,
            letterSpacing: "-1px",
            flex: 1,
            display: "flex",
            alignItems: "flex-start",
            maxWidth: "900px",
          }}
        >
          {moment.title.length > 80
            ? moment.title.slice(0, 77) + "..."
            : moment.title}
        </div>

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
            }}
          >
            {/* Date + time */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "22px",
                color: "rgba(255, 255, 255, 0.8)",
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
              {date} · {time}
            </div>

            {/* Location */}
            {location && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "20px",
                  color: "rgba(255, 255, 255, 0.6)",
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
                {location.length > 60
                  ? location.slice(0, 57) + "..."
                  : location}
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
            <span
              style={{
                fontSize: "16px",
                color: "rgba(255, 255, 255, 0.4)",
                fontWeight: 500,
              }}
            >
              The Playground
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

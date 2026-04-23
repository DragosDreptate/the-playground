import { ImageResponse } from "next/og";
import {
  prismaMomentRepository,
  prismaCircleRepository,
} from "@/infrastructure/repositories";
import { getMomentBySlug } from "@/domain/usecases/get-moment";
import { MomentNotFoundError } from "@/domain/errors";
import { isValidSlug } from "@/lib/slug";
import { getMomentGradient } from "@/lib/gradient";
import { loadOgCoverAsDataUrl } from "@/lib/og-image-loader";

export const runtime = "nodejs";
export const alt = "Event — The Playground";
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
  if (!isValidSlug(slug)) return new Response("Not found", { status: 404 });

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

  const dateLocale = locale === "fr" ? "fr-FR" : "en-US";
  const date = moment.startsAt.toLocaleDateString(dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = moment.startsAt.toLocaleTimeString(dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const onlineLabel = locale === "fr" ? "En ligne" : "Online";
  const hybridLabel = locale === "fr" ? "Hybride" : "Hybrid";
  const location =
    moment.locationType === "ONLINE"
      ? onlineLabel
      : moment.locationType === "HYBRID"
        ? hybridLabel
        : moment.locationName ?? moment.locationAddress ?? "";

  const gradient = getMomentGradient(moment.id);
  const coverDataUrl = moment.coverImage
    ? await loadOgCoverAsDataUrl(moment.coverImage)
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
            padding: "40px 48px 44px 48px",
          }}
        >
          {/* Top: branding, aligned to the right */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "9px",
                  background: "linear-gradient(135deg, #ec4899, #a855f7)",
                }}
              >
                <svg width="14" height="16" viewBox="0 0 13 15" fill="none">
                  <polygon points="0,0 0,15 13,7.5" fill="white" />
                </svg>
              </div>
              <div style={{ display: "flex", alignItems: "baseline" }}>
                <span
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "rgba(255, 255, 255, 0.4)",
                    letterSpacing: "-0.5px",
                  }}
                >
                  {"the "}
                </span>
                <span
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "#e8457a",
                    letterSpacing: "-0.5px",
                  }}
                >
                  playground
                </span>
              </div>
            </div>
          </div>

          {/* Middle: Circle name + title, centered vertically */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            {circle && (
              <div
                style={{
                  fontSize: "32px",
                  fontWeight: 600,
                  color: "#ec4899",
                  marginBottom: "24px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {circle.name}
              </div>
            )}

            <div
              style={{
                fontSize: "60px",
                fontWeight: 700,
                color: "white",
                lineHeight: 1.1,
                letterSpacing: "-1.5px",
                display: "flex",
              }}
            >
              {moment.title.length > 90
                ? moment.title.slice(0, 87) + "..."
                : moment.title}
            </div>
          </div>

          {/* Bottom: date + location */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                fontSize: "32px",
                color: "rgba(255, 255, 255, 0.85)",
              }}
            >
              <svg
                width="32"
                height="32"
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

            {location && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  fontSize: "28px",
                  color: "rgba(255, 255, 255, 0.6)",
                }}
              >
                <svg
                  width="28"
                  height="28"
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
                {location.length > 36
                  ? location.slice(0, 33) + "..."
                  : location}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

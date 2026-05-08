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
export const size = { width: 1200, height: 1200 };
export const contentType = "image/png";

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
  const month = moment.startsAt
    .toLocaleDateString(dateLocale, { month: "short" })
    .replace(/\.$/, "")
    .toUpperCase();
  const day = moment.startsAt.toLocaleDateString(dateLocale, { day: "numeric" });
  const weekday = moment.startsAt
    .toLocaleDateString(dateLocale, { weekday: "short" })
    .replace(/\.$/, "")
    .toUpperCase();
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

  const metaText = location
    ? `${weekday} ${time} · ${location}`
    : `${weekday} ${time}`;
  const truncatedMeta =
    metaText.length > 56 ? metaText.slice(0, 53) + "…" : metaText;

  const truncatedTitle =
    moment.title.length > 70 ? moment.title.slice(0, 67) + "…" : moment.title;

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

        {/* Bottom content : date pill + Circle name + title + meta */}
        <div
          style={{
            position: "absolute",
            left: 56,
            right: 56,
            bottom: 56,
            display: "flex",
            gap: 32,
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "white",
              borderRadius: 18,
              padding: "16px 22px",
              flexShrink: 0,
              boxShadow: "0 12px 36px rgba(0,0,0,0.5)",
            }}
          >
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#ec4899",
                textTransform: "uppercase",
                letterSpacing: "2.4px",
                lineHeight: 1,
                marginBottom: 8,
              }}
            >
              {month}
            </span>
            <span
              style={{
                fontSize: 56,
                fontWeight: 800,
                color: "#18181b",
                letterSpacing: "-1.5px",
                lineHeight: 1,
              }}
            >
              {day}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minWidth: 0,
            }}
          >
            {circle && (
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 600,
                  color: "#ff8eb6",
                  letterSpacing: "0.2px",
                  marginBottom: 10,
                  display: "flex",
                }}
              >
                {circle.name}
              </div>
            )}
            <div
              style={{
                fontSize: 56,
                fontWeight: 700,
                color: "white",
                lineHeight: 1.08,
                letterSpacing: "-1.5px",
                display: "flex",
              }}
            >
              {truncatedTitle}
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 500,
                color: "rgba(255, 255, 255, 0.78)",
                marginTop: 14,
                display: "flex",
              }}
            >
              {truncatedMeta}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

import {
  prismaMomentRepository,
  prismaCircleRepository,
} from "@/infrastructure/repositories";
import { renderOgImage } from "@/lib/og/render";
import { getMomentBySlug } from "@/domain/usecases/get-moment";
import { MomentNotFoundError } from "@/domain/errors";
import { isValidSlug } from "@/lib/slug";
import { getMomentGradient } from "@/lib/gradient";
import { loadOgCoverAsDataUrl } from "@/lib/og-image-loader";
import { formatOgDateBadge } from "@/lib/format-date";
import { truncate } from "@/lib/text";
import {
  OG_COLORS,
  OgBrandingPill,
  OgCoverBackground,
  OgPureCoverLayout,
} from "@/lib/og/components";
import type { LocationType } from "@/domain/models/moment";

export const runtime = "nodejs";
export const alt = "Event — The Playground";
export const size = { width: 1200, height: 1200 };
export const contentType = "image/jpeg";

const TITLE_MAX = 70;
const META_MAX = 56;

function formatLocationLabel(
  locationType: LocationType,
  locationName: string | null,
  locationAddress: string | null,
  locale: string,
): string {
  if (locationType === "ONLINE") return locale === "fr" ? "En ligne" : "Online";
  if (locationType === "HYBRID") return locale === "fr" ? "Hybride" : "Hybrid";
  return locationName ?? locationAddress ?? "";
}

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

  const coverDataUrl = moment.coverImage
    ? await loadOgCoverAsDataUrl(moment.coverImage)
    : null;

  if (coverDataUrl) {
    return renderOgImage(<OgPureCoverLayout coverDataUrl={coverDataUrl} />, {
      ...size,
    });
  }

  // Pas de cover → fallback content-rich : tout dans l'image puisque rien d'autre n'y figure.
  const circle = await prismaCircleRepository.findById(moment.circleId);
  const { month, day, weekday, time } = formatOgDateBadge(moment.startsAt, locale);
  const location = formatLocationLabel(
    moment.locationType,
    moment.locationName,
    moment.locationAddress,
    locale,
  );
  const metaText = location ? `${weekday} ${time} · ${location}` : `${weekday} ${time}`;

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
          gradient={getMomentGradient(moment.id)}
        />
        <OgBrandingPill />

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
                color: OG_COLORS.pink,
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
                color: OG_COLORS.zinc950,
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
                  color: OG_COLORS.pinkSoft,
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
              {truncate(moment.title, TITLE_MAX)}
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
              {truncate(metaText, META_MAX)}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

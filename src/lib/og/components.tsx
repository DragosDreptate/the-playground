/**
 * Composants JSX partagés par les og:image (next/og + Satori).
 *
 * Note Satori : tous les nœuds doivent porter `display: flex` (ou autre display
 * supporté). Les `<div>` "vides" qui peuvent sembler inutiles sont en fait
 * imposés par le moteur de rendu — ne pas les supprimer.
 */

const OG_SIZE = 1200;

const BRAND_PINK = "#ec4899";
const BRAND_PURPLE = "#a855f7";
const BRAND_PINK_BRIGHT = "#ff6097";
const BRAND_BG_DARK = "#0c0a14";

export const OG_COLORS = {
  pink: BRAND_PINK,
  purple: BRAND_PURPLE,
  pinkBright: BRAND_PINK_BRIGHT,
  pinkSoft: "#ff8eb6",
  bgDark: BRAND_BG_DARK,
  zinc950: "#18181b",
  logoGradient: `linear-gradient(135deg, ${BRAND_PINK}, ${BRAND_PURPLE})`,
} as const;

export function OgCoverBackground({
  coverDataUrl,
  gradient,
}: {
  coverDataUrl: string | null;
  gradient?: string;
}) {
  if (coverDataUrl) {
    return (
      <img
        src={coverDataUrl}
        alt=""
        width={OG_SIZE}
        height={OG_SIZE}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    );
  }
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: gradient,
        display: "flex",
      }}
    />
  );
}

/**
 * Layout og:image en mode "cover pure" : juste la cover plein cadre + la pill
 * de branding. Utilisé quand une cover est disponible — le titre, la date et
 * la description ne sont pas rasterisés dans l'image puisque les clients
 * (WhatsApp, iMessage, Slack…) les affichent déjà sous l'image via og:title
 * et og:description. Évite la triple redondance.
 */
export function OgPureCoverLayout({ coverDataUrl }: { coverDataUrl: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: OG_COLORS.bgDark,
      }}
    >
      <OgCoverBackground coverDataUrl={coverDataUrl} />
      <OgBrandingPill />
    </div>
  );
}

export function OgBrandingPill() {
  return (
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
          background: OG_COLORS.logoGradient,
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
            color: OG_COLORS.pinkBright,
            letterSpacing: "-0.5px",
          }}
        >
          playground
        </span>
      </div>
    </div>
  );
}

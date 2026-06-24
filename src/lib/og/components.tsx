/**
 * Composants JSX partagés par les og:image (next/og + Satori).
 *
 * Note Satori : tous les nœuds doivent porter `display: flex` (ou autre display
 * supporté). Les `<div>` "vides" qui peuvent sembler inutiles sont en fait
 * imposés par le moteur de rendu — ne pas les supprimer.
 */

import type { ReactNode } from "react";

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

/**
 * Châssis de l'og:image quand il n'y a pas de cover : fond gradient (dérivé de
 * l'ID de l'entité) + pill de branding. Le contenu spécifique (date, titre,
 * nom de Communauté…) est passé en `children`. Les pages avec cover ne passent
 * plus par ici : leur cover est servie en JPEG brut (cf. loadCoverAsOgJpeg).
 */
export function OgFallbackFrame({
  gradient,
  children,
}: {
  gradient: string;
  children: ReactNode;
}) {
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
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: gradient,
          display: "flex",
        }}
      />
      <OgBrandingPill />
      {children}
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

import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "The Playground — Lancez votre communauté";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(170deg, #0c0a14 0%, #150f22 50%, #1a1028 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top gradient bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "5px",
            background: "linear-gradient(90deg, #ec4899, #d946ef, #a855f7)",
          }}
        />

        {/* Bottom gradient bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "5px",
            background: "linear-gradient(90deg, #a855f7, #d946ef, #ec4899)",
          }}
        />

        {/* Subtle glow in top-right */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-80px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, transparent 70%)",
          }}
        />

        {/* Content container — left-aligned with generous padding */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            padding: "72px 80px",
          }}
        >
          {/* Logo row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginBottom: "48px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #ec4899, #a855f7)",
              }}
            >
              <svg
                width="18"
                height="21"
                viewBox="0 0 13 15"
                fill="none"
              >
                <polygon points="0,0 0,15 13,7.5" fill="white" />
              </svg>
            </div>
            <span
              style={{
                fontSize: "22px",
                fontWeight: 600,
                color: "rgba(255, 255, 255, 0.7)",
                letterSpacing: "-0.3px",
              }}
            >
              The Playground
            </span>
          </div>

          {/* H1 — 3 lines */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              marginBottom: "40px",
            }}
          >
            {/* Line 1 */}
            <div
              style={{
                display: "flex",
                fontSize: "54px",
                fontWeight: 700,
                letterSpacing: "-1.5px",
                lineHeight: 1.2,
              }}
            >
              <span
                style={{
                  background: "linear-gradient(90deg, #ec4899, #d946ef, #a855f7)",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Lancez
              </span>
              <span style={{ color: "white", marginLeft: "14px" }}>
                votre Cercle.
              </span>
            </div>

            {/* Line 2 */}
            <div
              style={{
                display: "flex",
                fontSize: "54px",
                fontWeight: 700,
                letterSpacing: "-1.5px",
                lineHeight: 1.2,
              }}
            >
              <span
                style={{
                  background: "linear-gradient(90deg, #ec4899, #d946ef, #a855f7)",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Organisez
              </span>
              <span style={{ color: "white", marginLeft: "14px" }}>
                vos Escales.
              </span>
            </div>

            {/* Line 3 */}
            <div
              style={{
                display: "flex",
                fontSize: "54px",
                fontWeight: 700,
                letterSpacing: "-1.5px",
                lineHeight: 1.2,
              }}
            >
              <span
                style={{
                  background: "linear-gradient(90deg, #ec4899, #d946ef, #a855f7)",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Fédérez
              </span>
              <span style={{ color: "white", marginLeft: "14px" }}>
                votre audience.
              </span>
            </div>
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: "22px",
              color: "rgba(255, 255, 255, 0.5)",
              lineHeight: 1.5,
              maxWidth: "600px",
              fontWeight: 400,
            }}
          >
            La plateforme gratuite pour créer votre communauté et organiser des événements mémorables.
          </div>
        </div>

        {/* Bottom-right branding */}
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            right: "32px",
            fontSize: "14px",
            color: "rgba(255, 255, 255, 0.2)",
            letterSpacing: "0.5px",
          }}
        >
          the-playground.fr
        </div>
      </div>
    ),
    { ...size }
  );
}

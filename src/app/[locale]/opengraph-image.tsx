import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "The Playground";
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
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #0c0a14 0%, #1a1028 100%)",
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

        {/* Icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "80px",
            height: "80px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #ec4899, #a855f7)",
            marginBottom: "32px",
          }}
        >
          <svg
            width="32"
            height="38"
            viewBox="0 0 13 15"
            fill="none"
          >
            <polygon points="0,0 0,15 13,7.5" fill="white" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: 700,
            color: "white",
            letterSpacing: "-1px",
          }}
        >
          The Playground
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "24px",
            color: "rgba(255, 255, 255, 0.6)",
            marginTop: "16px",
            maxWidth: "700px",
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Lancez votre communauté. Organisez vos événements.
        </div>

        {/* Bottom branding */}
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            right: "32px",
            fontSize: "14px",
            color: "rgba(255, 255, 255, 0.3)",
          }}
        >
          theplayground.community
        </div>
      </div>
    ),
    { ...size }
  );
}

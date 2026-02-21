import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #ec4899, #a855f7)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "7px",
        }}
      >
        {/* Triangle play — légèrement décalé à droite pour l'équilibre optique */}
        <svg
          width="13"
          height="15"
          viewBox="0 0 13 15"
          fill="none"
          style={{ marginLeft: "2px" }}
        >
          <polygon points="0,0 0,15 13,7.5" fill="white" />
        </svg>
      </div>
    ),
    { ...size }
  );
}

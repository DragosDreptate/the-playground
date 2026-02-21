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
        <span
          style={{
            color: "white",
            fontSize: "18px",
            fontWeight: 800,
            letterSpacing: "-1px",
            fontFamily: "sans-serif",
          }}
        >
          P
        </span>
      </div>
    ),
    { ...size }
  );
}

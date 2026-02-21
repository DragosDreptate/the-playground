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
        {/* Anneau (Circle) */}
        <div
          style={{
            width: "20px",
            height: "20px",
            border: "2.5px solid white",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Point central (Moment) */}
          <div
            style={{
              width: "6px",
              height: "6px",
              background: "white",
              borderRadius: "50%",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}

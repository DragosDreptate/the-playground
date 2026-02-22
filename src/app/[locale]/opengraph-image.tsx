import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const alt = "The Playground — Lancez votre communauté";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const [interRegular, interBold, phoneImg] = await Promise.all([
    readFile(join(process.cwd(), "src/assets/fonts/Inter-Regular.ttf")),
    readFile(join(process.cwd(), "src/assets/fonts/Inter-Bold.ttf")),
    readFile(join(process.cwd(), "src/assets/og-phone.png")),
  ]);

  const phoneBase64 = `data:image/png;base64,${phoneImg.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          fontFamily: "Inter",
          background: "#0c0c1c",
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

        {/* LEFT — Text content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            padding: "64px 0 64px 72px",
            maxWidth: "680px",
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
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #ec4899, #a855f7)",
              }}
            >
              <svg width="16" height="19" viewBox="0 0 13 15" fill="none">
                <polygon points="0,0 0,15 13,7.5" fill="white" />
              </svg>
            </div>
            <span
              style={{
                fontSize: "20px",
                fontWeight: 400,
                color: "rgba(255, 255, 255, 0.55)",
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
              gap: "2px",
              marginBottom: "36px",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "50px",
                fontWeight: 700,
                letterSpacing: "-2px",
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

            <div
              style={{
                display: "flex",
                fontSize: "50px",
                fontWeight: 700,
                letterSpacing: "-2px",
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

            <div
              style={{
                display: "flex",
                fontSize: "50px",
                fontWeight: 700,
                letterSpacing: "-2px",
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
              fontSize: "19px",
              color: "rgba(255, 255, 255, 0.4)",
              lineHeight: 1.6,
              maxWidth: "480px",
              fontWeight: 400,
            }}
          >
            La plateforme gratuite pour créer votre communauté et organiser des événements mémorables.
          </div>
        </div>

        {/* RIGHT — Phone mockup */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "420px",
            paddingRight: "40px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={phoneBase64}
            alt=""
            width={320}
            height={464}
            style={{
              objectFit: "contain",
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Inter",
          data: interRegular,
          style: "normal" as const,
          weight: 400 as const,
        },
        {
          name: "Inter",
          data: interBold,
          style: "normal" as const,
          weight: 700 as const,
        },
      ],
    }
  );
}

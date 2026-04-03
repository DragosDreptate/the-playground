import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPostBySlug, getPostSlugs } from "@/lib/blog";

export const runtime = "nodejs";
export const alt = "Blog — The Playground";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams() {
  const locales = ["fr", "en"];
  const params: { slug: string; locale: string }[] = [];
  for (const locale of locales) {
    for (const slug of getPostSlugs(locale)) {
      params.push({ slug, locale });
    }
  }
  return params;
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const post = await getPostBySlug(slug, locale);
  if (!post) return new Response("Not found", { status: 404 });

  const [interRegular, interBold] = await Promise.all([
    readFile(join(process.cwd(), "src/assets/fonts/Inter-Regular.ttf")),
    readFile(join(process.cwd(), "src/assets/fonts/Inter-Bold.ttf")),
  ]);

  const dateLabel = new Date(post.date).toLocaleDateString(
    locale === "fr" ? "fr-FR" : "en-US",
    { day: "numeric", month: "long", year: "numeric" },
  );

  const title =
    post.title.length > 80 ? post.title.slice(0, 77) + "..." : post.title;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, #0c0a14 0%, #1a1028 100%)",
          padding: "48px 56px",
          position: "relative",
          fontFamily: "Inter",
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

        {/* Blog label */}
        <div
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "#ec4899",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            textTransform: "uppercase",
            letterSpacing: "2px",
          }}
        >
          Blog
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "48px",
            fontWeight: 700,
            color: "white",
            lineHeight: 1.15,
            letterSpacing: "-1px",
            flex: 1,
            display: "flex",
            alignItems: "flex-start",
            maxWidth: "1000px",
          }}
        >
          {title}
        </div>

        {/* Bottom info */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          {/* Date */}
          <div
            style={{
              fontSize: "20px",
              color: "rgba(255, 255, 255, 0.6)",
              display: "flex",
              alignItems: "center",
            }}
          >
            {dateLabel}
          </div>

          {/* Branding */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "28px",
                height: "28px",
                borderRadius: "7px",
                background: "linear-gradient(135deg, #ec4899, #a855f7)",
              }}
            >
              <svg width="11" height="13" viewBox="0 0 13 15" fill="none">
                <polygon points="0,0 0,15 13,7.5" fill="white" />
              </svg>
            </div>
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "rgba(255, 255, 255, 0.4)",
                  letterSpacing: "-0.4px",
                }}
              >
                {"the\u2009"}
              </span>
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#e8457a",
                  letterSpacing: "-0.4px",
                }}
              >
                playground
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: interRegular, style: "normal", weight: 400 },
        { name: "Inter", data: interBold, style: "normal", weight: 700 },
      ],
    },
  );
}

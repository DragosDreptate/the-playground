import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/m/", "/circles/"],
        disallow: ["/dashboard/", "/admin/", "/api/", "/auth/"],
      },
      // Block aggressive crawlers that ignore rate limits
      {
        userAgent: [
          "AhrefsBot",
          "SemrushBot",
          "DotBot",
          "MJ12bot",
          "BLEXBot",
          "DataForSeoBot",
          "Bytespider",
          "GPTBot",
          "ClaudeBot",
          "CCBot",
          "ZoominfoBot",
          "PetalBot",
        ],
        disallow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

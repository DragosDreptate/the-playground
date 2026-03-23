import type { MetadataRoute } from "next";
import { BLOCKED_BOTS } from "@/lib/blocked-bots";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/m/", "/circles/"],
        disallow: ["/dashboard/", "/admin/", "/api/", "/auth/"],
      },
      {
        userAgent: BLOCKED_BOTS,
        disallow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

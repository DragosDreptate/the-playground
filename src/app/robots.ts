import type { MetadataRoute } from "next";
import { AGGRESSIVE_CRAWLERS, AI_TRAINING_BOTS } from "@/lib/blocked-bots";

const PRIVATE_PATHS = ["/dashboard/", "/admin/", "/api/", "/auth/"];

// User-generated content: Moments (/m/), Circles (/circles/) and Networks
// (/networks/, which list their Circles' names and descriptions) in both
// locales, plus the embed widget. These belong to Hosts, not to the platform.
const UGC_PATHS = [
  "/m/",
  "/circles/",
  "/networks/",
  "/en/m/",
  "/en/circles/",
  "/en/networks/",
  "/embed/m/",
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/m/", "/circles/"],
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: AI_TRAINING_BOTS,
        disallow: [...PRIVATE_PATHS, ...UGC_PATHS],
      },
      {
        userAgent: AGGRESSIVE_CRAWLERS,
        disallow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

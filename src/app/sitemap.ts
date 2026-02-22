import type { MetadataRoute } from "next";
import { prisma } from "@/infrastructure/db/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/explorer`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/legal/mentions-legales`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${baseUrl}/legal/confidentialite`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${baseUrl}/legal/cgu`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  // Public circles
  const circles = await prisma.circle.findMany({
    where: { visibility: "PUBLIC" },
    select: { slug: true, updatedAt: true },
  });

  const circlePages: MetadataRoute.Sitemap = circles.map((circle) => ({
    url: `${baseUrl}/circles/${circle.slug}`,
    lastModified: circle.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Published + past moments (CANCELLED excluded — they return 404)
  const moments = await prisma.moment.findMany({
    where: { status: { in: ["PUBLISHED", "PAST"] } },
    select: { slug: true, updatedAt: true },
  });

  const momentPages: MetadataRoute.Sitemap = moments.map((moment) => ({
    url: `${baseUrl}/m/${moment.slug}`,
    lastModified: moment.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...circlePages, ...momentPages];
}

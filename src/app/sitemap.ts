import type { MetadataRoute } from "next";
import { prisma } from "@/infrastructure/db/prisma";

function withAlternates(
  baseUrl: string,
  path: string,
  opts: { lastModified: Date; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number },
): MetadataRoute.Sitemap[number] {
  const frUrl = path ? `${baseUrl}/${path}` : baseUrl;
  const enUrl = path ? `${baseUrl}/en/${path}` : `${baseUrl}/en`;

  return {
    url: frUrl,
    lastModified: opts.lastModified,
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    alternates: {
      languages: {
        fr: frUrl,
        en: enUrl,
      },
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    withAlternates(baseUrl, "", { lastModified: now, changeFrequency: "weekly", priority: 1 }),
    withAlternates(baseUrl, "explorer", { lastModified: now, changeFrequency: "daily", priority: 0.9 }),
    withAlternates(baseUrl, "about", { lastModified: now, changeFrequency: "monthly", priority: 0.6 }),
    withAlternates(baseUrl, "help", { lastModified: now, changeFrequency: "monthly", priority: 0.5 }),
    withAlternates(baseUrl, "contact", { lastModified: now, changeFrequency: "monthly", priority: 0.5 }),
    withAlternates(baseUrl, "changelog", { lastModified: now, changeFrequency: "weekly", priority: 0.4 }),
    withAlternates(baseUrl, "legal/mentions-legales", { lastModified: now, changeFrequency: "yearly", priority: 0.2 }),
    withAlternates(baseUrl, "legal/confidentialite", { lastModified: now, changeFrequency: "yearly", priority: 0.2 }),
    withAlternates(baseUrl, "legal/cgu", { lastModified: now, changeFrequency: "yearly", priority: 0.2 }),
  ];

  // Public circles
  const circles = await prisma.circle.findMany({
    where: { visibility: "PUBLIC" },
    select: { slug: true, updatedAt: true },
  });

  const circlePages: MetadataRoute.Sitemap = circles.map((circle) =>
    withAlternates(baseUrl, `circles/${circle.slug}`, {
      lastModified: circle.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
  );

  // Published + past moments (CANCELLED excluded — they return 404)
  const moments = await prisma.moment.findMany({
    where: { status: { in: ["PUBLISHED", "PAST"] } },
    select: { slug: true, updatedAt: true },
  });

  const momentPages: MetadataRoute.Sitemap = moments.map((moment) =>
    withAlternates(baseUrl, `m/${moment.slug}`, {
      lastModified: moment.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }),
  );

  return [...staticPages, ...circlePages, ...momentPages];
}

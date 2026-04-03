import type { MetadataRoute } from "next";
import { prisma } from "@/infrastructure/db/prisma";
import { getAppUrl } from "@/lib/app-url";

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
  const baseUrl = getAppUrl();
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

  // Exclude circles owned by test/demo users
  const testDemoMemberships = await prisma.circleMembership.findMany({
    where: {
      role: "HOST",
      user: {
        OR: [
          { email: { endsWith: "@test.playground" } },
          { email: { endsWith: "@demo.playground" } },
        ],
      },
    },
    select: { circleId: true },
  });
  const excludeCircleIds = testDemoMemberships.map((m) => m.circleId);

  // Public circles + published/past moments (excluding test/demo), in parallel
  const [circles, moments] = await Promise.all([
    prisma.circle.findMany({
      where: {
        visibility: "PUBLIC",
        id: { notIn: excludeCircleIds },
      },
      select: { slug: true, updatedAt: true },
    }),
    prisma.moment.findMany({
      where: {
        status: { in: ["PUBLISHED", "PAST"] },
        circleId: { notIn: excludeCircleIds },
      },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const circlePages: MetadataRoute.Sitemap = circles.map((circle) =>
    withAlternates(baseUrl, `circles/${circle.slug}`, {
      lastModified: circle.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
  );

  const momentPages: MetadataRoute.Sitemap = moments.map((moment) =>
    withAlternates(baseUrl, `m/${moment.slug}`, {
      lastModified: moment.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }),
  );

  return [...staticPages, ...circlePages, ...momentPages];
}

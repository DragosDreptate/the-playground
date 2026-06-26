import type { MetadataRoute } from "next";
import { prisma } from "@/infrastructure/db/prisma";
import { getAllPosts } from "@/lib/blog";
import { buildLocalizedUrls } from "@/lib/seo";

function withAlternates(
  path: string,
  opts: { lastModified: Date; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number },
): MetadataRoute.Sitemap[number] {
  const urls = buildLocalizedUrls(path);
  return {
    url: urls.fr,
    lastModified: opts.lastModified,
    changeFrequency: opts.changeFrequency,
    priority: opts.priority,
    alternates: {
      languages: { ...urls, "x-default": urls.fr },
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    withAlternates("", { lastModified: now, changeFrequency: "weekly", priority: 1 }),
    withAlternates("/explorer", { lastModified: now, changeFrequency: "daily", priority: 0.9 }),
    withAlternates("/about", { lastModified: now, changeFrequency: "monthly", priority: 0.6 }),
    withAlternates("/help", { lastModified: now, changeFrequency: "monthly", priority: 0.5 }),
    withAlternates("/contact", { lastModified: now, changeFrequency: "monthly", priority: 0.5 }),
    withAlternates("/changelog", { lastModified: now, changeFrequency: "weekly", priority: 0.4 }),
    withAlternates("/legal/mentions-legales", { lastModified: now, changeFrequency: "yearly", priority: 0.2 }),
    withAlternates("/legal/confidentialite", { lastModified: now, changeFrequency: "yearly", priority: 0.2 }),
    withAlternates("/legal/cgu", { lastModified: now, changeFrequency: "yearly", priority: 0.2 }),
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
        // N'expose pas les événements rattachés à une Communauté privée :
        // accessibles par lien direct, mais hors sitemap et non indexés
        // (cf. noindex dans /m/[slug]/page.tsx).
        circle: { visibility: "PUBLIC" },
      },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const circlePages: MetadataRoute.Sitemap = circles.map((circle) =>
    withAlternates(`/circles/${circle.slug}`, {
      lastModified: circle.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
  );

  const momentPages: MetadataRoute.Sitemap = moments.map((moment) =>
    withAlternates(`/m/${moment.slug}`, {
      lastModified: moment.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }),
  );

  // Blog posts
  const blogPosts = getAllPosts("fr");
  const blogPages: MetadataRoute.Sitemap = [
    withAlternates("/blog", { lastModified: now, changeFrequency: "weekly", priority: 0.5 }),
    ...blogPosts.map((post) =>
      withAlternates(`/blog/${post.slug}`, {
        lastModified: new Date(post.date),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }),
    ),
  ];

  return [...staticPages, ...blogPages, ...circlePages, ...momentPages];
}

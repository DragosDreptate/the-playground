import type { MetadataRoute } from "next";
import { prisma } from "@/infrastructure/db/prisma";
import { SYNTHETIC_EMAIL_SUFFIXES } from "@/lib/synthetic-accounts";
import { getAllPosts } from "@/lib/blog";
import { buildLocalizedUrls, isMomentIndexable } from "@/lib/seo";

// Sans revalidate, le sitemap est figé au build : les événements et Communautés
// créés entre deux mises en ligne n'y apparaissaient pas. Une semaine suffit.
export const revalidate = 604800;

type Entry = MetadataRoute.Sitemap[number];
type EntryOptions = Pick<Entry, "lastModified" | "changeFrequency" | "priority">;

// Pages éditoriales, réellement traduites : FR + EN déclarées en alternates.
function withAlternates(path: string, opts: EntryOptions): Entry {
  const urls = buildLocalizedUrls(path);
  return {
    url: urls.fr,
    ...opts,
    alternates: {
      languages: { ...urls, "x-default": urls.fr },
    },
  };
}

// Contenu écrit par les utilisateurs : seule l'URL FR est indexable (cf.
// buildUgcIndexing dans lib/seo.ts), donc pas d'alternate EN.
function frOnly(path: string, opts: EntryOptions): Entry {
  return { url: buildLocalizedUrls(path).fr, ...opts };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Pages fixes : pas de lastModified. Une date « maintenant » recalculée à chaque
  // génération est fausse, et Google finit par ignorer les dates du sitemap.
  const staticPages: MetadataRoute.Sitemap = [
    withAlternates("", { changeFrequency: "weekly", priority: 1 }),
    withAlternates("/explorer", { changeFrequency: "daily", priority: 0.9 }),
    withAlternates("/about", { changeFrequency: "monthly", priority: 0.6 }),
    withAlternates("/help", { changeFrequency: "monthly", priority: 0.5 }),
    withAlternates("/contact", { changeFrequency: "monthly", priority: 0.5 }),
    withAlternates("/changelog", { changeFrequency: "weekly", priority: 0.4 }),
    withAlternates("/legal/mentions-legales", { changeFrequency: "yearly", priority: 0.2 }),
    withAlternates("/legal/confidentialite", { changeFrequency: "yearly", priority: 0.2 }),
    withAlternates("/legal/cgu", { changeFrequency: "yearly", priority: 0.2 }),
  ];

  // Exclude circles owned by synthetic accounts (test, demo, E2E). Règle propre
  // au sitemap : les pages, elles, ne connaissent pas l'email de l'Organisateur
  // et restent indexables.
  const testDemoMemberships = await prisma.circleMembership.findMany({
    where: {
      role: "HOST",
      user: {
        OR: SYNTHETIC_EMAIL_SUFFIXES.map((suffix) => ({ email: { endsWith: suffix } })),
      },
    },
    select: { circleId: true },
  });
  const excludeCircleIds = testDemoMemberships.map((m) => m.circleId);

  // Reproduit isCircleIndexable (lib/seo.ts) côté base : les deux sont à garder
  // alignés. Pour les événements, isMomentIndexable tranche en plus la
  // description vide, que la base ne sait pas tester après trim.
  const indexableCircle = { visibility: "PUBLIC", isDemo: false } as const;
  const [circles, moments, networks] = await Promise.all([
    prisma.circle.findMany({
      where: { ...indexableCircle, id: { notIn: excludeCircleIds } },
      select: { slug: true, updatedAt: true },
    }),
    prisma.moment.findMany({
      where: {
        status: { in: ["PUBLISHED", "PAST"] },
        circleId: { notIn: excludeCircleIds },
        circle: indexableCircle,
      },
      select: {
        slug: true,
        updatedAt: true,
        description: true,
        circle: { select: { visibility: true, isDemo: true } },
      },
    }),
    prisma.circleNetwork.findMany({ select: { slug: true, updatedAt: true } }),
  ]);

  const circlePages = circles.map((circle) =>
    frOnly(`/circles/${circle.slug}`, {
      lastModified: circle.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
  );

  const momentPages = moments
    .filter((moment) => isMomentIndexable(moment, moment.circle))
    .map((moment) =>
      frOnly(`/m/${moment.slug}`, {
        lastModified: moment.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      }),
    );

  const networkPages = networks.map((network) =>
    frOnly(`/networks/${network.slug}`, {
      lastModified: network.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    }),
  );

  // Blog : getAllPosts trie du plus récent au plus ancien, donc l'index du blog
  // prend la date du dernier article publié.
  const blogPosts = getAllPosts("fr");
  const blogPages: MetadataRoute.Sitemap = [
    withAlternates("/blog", {
      lastModified: blogPosts[0] ? new Date(blogPosts[0].date) : undefined,
      changeFrequency: "weekly",
      priority: 0.5,
    }),
    ...blogPosts.map((post) =>
      withAlternates(`/blog/${post.slug}`, {
        lastModified: new Date(post.date),
        changeFrequency: "monthly",
        priority: 0.6,
      }),
    ),
  ];

  return [...staticPages, ...blogPages, ...networkPages, ...circlePages, ...momentPages];
}

import type { Metadata } from "next";
import { routing, isSupportedLocale, type Locale } from "@/i18n/routing";
import type { CircleVisibility } from "@/domain/models/circle";
import { getAppUrl } from "./app-url";

type LocaleUrls = Record<Locale, string>;

// Source unique de la règle SEO « Communauté privée ou de démo = masquée des
// crawlers ». Partagée par /m/[slug] (noindex + JSON-LD événement),
// /circles/[slug] (noindex + JSON-LD) : une page rattachée à une Communauté
// n'est indexable que si celle-ci est publique et réelle (une Communauté de démo
// est un faux contenu de vitrine). Fail-safe : un Circle absent (null/undefined)
// est non indexable. Le sitemap applique la même règle via un filtre Prisma.
export function isCircleIndexable(
  circle: { visibility: CircleVisibility; isDemo: boolean } | null | undefined,
): boolean {
  return circle?.visibility === "PUBLIC" && !circle.isDemo;
}

// Un événement sans description n'apporte rien à Google (titre et date seuls) et
// pèse sur la qualité perçue du site : on ne l'indexe pas. Partagé par
// /m/[slug] et le sitemap.
export function isMomentIndexable(
  moment: { description: string },
  circle: Parameters<typeof isCircleIndexable>[0],
): boolean {
  return isCircleIndexable(circle) && moment.description.trim() !== "";
}

// Open Graph + Twitter Card pour l'aperçu social (unfurl Slack/WhatsApp/iMessage…).
// Partagé par /m/[slug] et /circles/[slug] : l'aperçu est émis pour toute page
// accessible par lien, indépendamment de l'indexation crawler (robots). On
// découple volontairement « privé = non indexable » de « génère l'aperçu de
// partage ». L'og:image est injectée par la convention opengraph-image.tsx de
// chaque route.
export function buildSocialMetadata(
  title: string,
  description: string,
): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

// Per-locale absolute URLs for a path. `path` is the URL after the locale
// segment, with a leading slash for sub-paths (e.g. "/m/abc"). Use "" for the
// home page. Shared between page metadata and the sitemap.
export function buildLocalizedUrls(path: string): LocaleUrls {
  const appUrl = getAppUrl();
  const suffix = path === "/" ? "" : path;
  return {
    fr: `${appUrl}${suffix}`,
    en: `${appUrl}/en${suffix}`,
  };
}

// Canonical + hreflang alternates for a localized page. Each locale
// self-references so Google never sees the EN version pointing to the FR
// canonical (the "duplicate without user-selected canonical" warning).
// x-default points to FR.
export function buildAlternates(locale: string, path: string) {
  const urls = buildLocalizedUrls(path);
  const safe = isSupportedLocale(locale) ? locale : routing.defaultLocale;
  return {
    canonical: urls[safe],
    languages: {
      ...urls,
      "x-default": urls.fr,
    },
  };
}

// Contenu écrit par les utilisateurs (événements, Communautés, Réseaux) : rédigé
// une seule fois, dans la langue de son auteur ; /en n'en traduit que l'interface.
// Indexer les deux URLs exposait à Google des doublons quasi identiques (cf.
// spec/decisions.md, 2026-10-20). Seule l'URL FR est indexable, sans hreflang
// vers une version EN qui ne l'est pas. La version EN reste suivie (follow) pour
// que Google remonte vers les pages FR liées.
export function buildUgcIndexing(
  locale: string,
  path: string,
  indexable: boolean,
): Pick<Metadata, "alternates" | "robots"> {
  const safe = isSupportedLocale(locale) ? locale : routing.defaultLocale;
  const alternates = { canonical: buildLocalizedUrls(path)[safe] };
  if (!indexable) return { alternates, robots: { index: false, follow: false } };
  if (safe !== routing.defaultLocale) {
    return { alternates, robots: { index: false, follow: true } };
  }
  return { alternates };
}

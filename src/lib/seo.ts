import { routing, isSupportedLocale, type Locale } from "@/i18n/routing";
import type { CircleVisibility } from "@/domain/models/circle";
import { getAppUrl } from "./app-url";

type LocaleUrls = Record<Locale, string>;

// Source unique de la règle SEO « Communauté privée = masquée des crawlers ».
// Partagée par /m/[slug] (noindex + JSON-LD événement), /circles/[slug] (noindex)
// : une page rattachée à une Communauté n'est indexable que si celle-ci est
// publique. Fail-safe : un Circle absent (null/undefined) est non indexable.
// Le sitemap applique la même règle via un filtre Prisma (circle.visibility).
export function isCircleIndexable(
  circle: { visibility: CircleVisibility } | null | undefined,
): boolean {
  return circle?.visibility === "PUBLIC";
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

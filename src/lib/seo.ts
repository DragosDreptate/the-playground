import { getAppUrl } from "./app-url";

type Locale = "fr" | "en";

type Alternates = {
  canonical: string;
  languages: { fr: string; en: string; "x-default": string };
};

// Build canonical + hreflang alternates for a localized page.
// Each locale auto-references itself (avoids Google's "duplicate without
// user-selected canonical"), and x-default points to the FR version.
//
// `path` is the URL after the locale segment, with leading slash for sub-paths
// (e.g. "/m/abc", "/blog"). Use "" for the home page.
export function buildAlternates(locale: Locale, path: string): Alternates {
  const appUrl = getAppUrl();
  const suffix = path === "/" ? "" : path;
  const frUrl = `${appUrl}${suffix}`;
  const enUrl = `${appUrl}/en${suffix}`;

  return {
    canonical: locale === "fr" ? frUrl : enUrl,
    languages: {
      fr: frUrl,
      en: enUrl,
      "x-default": frUrl,
    },
  };
}

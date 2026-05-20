import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { isValidSlug } from "./slug";

const localeAlt = routing.locales.join("|");
const dashboardEventRe = new RegExp(
  `^(?:/(${localeAlt}))?/dashboard/circles/[^/]+/moments/([^/]+)(?:/.*)?$`
);

// `/moments/new` is the creation route, not an event slug.
const RESERVED_MOMENT_SEGMENTS = new Set(["new"]);

/** Pathname of the public event page for a given moment slug. */
export function publicMomentPath(slug: string): string {
  return `/m/${slug}`;
}

/** Server-side redirect to the public event page (throws NEXT_REDIRECT). */
export function redirectToPublicMoment(slug: string): never {
  redirect(publicMomentPath(slug));
}

/** Maps a dashboard event pathname to its public `/m/[slug]` equivalent. */
export function dashboardEventPublicPath(pathname: string): string | null {
  const match = pathname.match(dashboardEventRe);
  if (!match) return null;

  const locale = match[1];
  const momentSlug = decodeURIComponent(match[2]);
  if (RESERVED_MOMENT_SEGMENTS.has(momentSlug)) return null;
  if (!isValidSlug(momentSlug)) return null;

  return `${locale ? `/${locale}` : ""}${publicMomentPath(momentSlug)}`;
}

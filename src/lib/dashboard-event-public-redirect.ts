import { routing } from "@/i18n/routing";
import { isValidSlug } from "./slug";

const localeAlt = routing.locales.join("|");
const dashboardEventRe = new RegExp(
  `^(?:/(${localeAlt}))?/dashboard/circles/[^/]+/moments/([^/]+)(?:/.*)?$`
);

/**
 * If `pathname` targets a dashboard event view, returns the matching public
 * `/m/[slug]` pathname (locale preserved). Returns `null` otherwise.
 *
 * Used by the middleware to bounce unauthenticated visitors from a shared
 * dashboard link to the public event page, so they stay in the funnel
 * instead of hitting the sign-in screen.
 */
export function dashboardEventPublicPath(pathname: string): string | null {
  const match = pathname.match(dashboardEventRe);
  if (!match) return null;

  const locale = match[1];
  const momentSlug = decodeURIComponent(match[2]);
  if (!isValidSlug(momentSlug)) return null;

  return `${locale ? `/${locale}` : ""}/m/${momentSlug}`;
}

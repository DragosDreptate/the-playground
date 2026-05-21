import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { isValidSlug } from "./lib/slug";
import { BLOCKED_BOTS } from "./lib/blocked-bots";
import { dashboardEventPublicPath } from "./lib/dashboard-event-public-redirect";

// Auth.js v5 stores the session under `authjs.session-token` (HTTP) or
// `__Secure-authjs.session-token` (HTTPS). Presence-only check — middleware
// stays edge-friendly and the dashboard layout still validates the session.
const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name));
}

const intlMiddleware = createMiddleware(routing);

// Build locale-aware regex dynamically from routing config
const localeAlt = routing.locales.join("|");
const slugRouteRe = new RegExp(
  `^(?:\\/(?:${localeAlt}))?\\/(?:m|circles)\\/([^/]+)(?:\\/|$)`
);

// Next.js metadata file routes (opengraph-image, twitter-image) — optional hash suffix
// e.g. /fr/circles/[slug]/opengraph-image-gwtces
const metadataFileRe = /\/(opengraph-image|twitter-image)(-[^/]+)?$/;

function isBlockedBot(ua: string): boolean {
  const lower = ua.toLowerCase();
  return BLOCKED_BOTS.some((bot) => lower.includes(bot));
}

export default function middleware(request: NextRequest) {
  // 1. Block known aggressive bots early (Edge, zero serverless cost)
  const ua = request.headers.get("user-agent") ?? "";
  if (ua && isBlockedBot(ua)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // 2. Bypass next-intl for Next.js metadata file routes. The i18n middleware
  // strips the default locale prefix (e.g. /fr/...) via a 307 redirect, which
  // drops the hash query string and breaks social crawlers (LinkedIn, X...)
  // that don't follow redirects on og:image URLs. Next.js file-based routing
  // still resolves these routes correctly without the middleware rewrite.
  if (metadataFileRe.test(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // 3. Validate slugs on public routes before any processing
  const slugMatch = request.nextUrl.pathname.match(slugRouteRe);
  if (slugMatch) {
    const slug = decodeURIComponent(slugMatch[1]);
    if (!isValidSlug(slug)) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  // 4. Bounce shared dashboard event links to the public page for visitors
  // without a session, so they stay in the funnel instead of hitting sign-in.
  const dashboardEventPath = dashboardEventPublicPath(request.nextUrl.pathname);
  if (dashboardEventPath && !hasSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = dashboardEventPath;
    return NextResponse.redirect(url);
  }

  // 5. Delegate to next-intl middleware
  return intlMiddleware(request);
}

export const config = {
  // `embed(?:/|$)` (vs simple `embed`) évite de matcher des paths futurs
  // comme /embedded-foo qui ne sont pas l'app widget embed.
  matcher: ["/((?!api|_next|_vercel|monitoring|ingest|icon|embed(?:/|$)|.*\\..*).*)"],
};

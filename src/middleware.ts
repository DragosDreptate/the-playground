import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { isValidSlug } from "./lib/slug";
import { BLOCKED_BOTS } from "./lib/blocked-bots";

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

  // 4. Delegate to next-intl middleware
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|monitoring|ingest|icon|.*\\..*).*)"],
};

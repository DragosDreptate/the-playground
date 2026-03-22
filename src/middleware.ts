import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Slug validation regex — matches output of generateSlug()
const VALID_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 120;

// Known aggressive bot User-Agents (case-insensitive partial match)
const BLOCKED_BOTS = [
  "ahrefsbot",
  "semrushbot",
  "dotbot",
  "mj12bot",
  "blexbot",
  "dataforseo",
  "bytespider",
  "gptbot",
  "claudebot",
  "ccbot",
  "zoominfobot",
  "petalbot",
];

function isBlockedBot(ua: string): boolean {
  const lower = ua.toLowerCase();
  return BLOCKED_BOTS.some((bot) => lower.includes(bot));
}

function isValidSlug(slug: string): boolean {
  if (!slug || slug.length > MAX_SLUG_LENGTH) return false;
  return VALID_SLUG_RE.test(slug);
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Block known aggressive bots early (Edge, zero serverless cost)
  const ua = request.headers.get("user-agent") ?? "";
  if (ua && isBlockedBot(ua)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // 2. Validate slugs on public routes before any processing
  //    Patterns: /m/{slug}, /en/m/{slug}, /fr/m/{slug},
  //              /circles/{slug}, /en/circles/{slug}, /fr/circles/{slug}
  const slugMatch = pathname.match(
    /^(?:\/(?:fr|en))?\/(?:m|circles)\/([^/]+)(?:\/|$)/
  );
  if (slugMatch) {
    const slug = decodeURIComponent(slugMatch[1]);
    if (!isValidSlug(slug)) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  // 3. Delegate to next-intl middleware
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|monitoring|ingest|icon|.*\\..*).*)"],
};

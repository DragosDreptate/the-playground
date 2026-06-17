import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { get } from "@vercel/edge-config";
import { routing } from "./i18n/routing";
import { isValidSlug } from "./lib/slug";
import { AGGRESSIVE_CRAWLERS, AI_TRAINING_BOTS } from "./lib/blocked-bots";
import { dashboardEventPublicPath } from "./lib/dashboard-event-public-redirect";
import {
  MAINTENANCE_BYPASS_COOKIE,
  MAINTENANCE_BYPASS_COOKIE_MAX_AGE,
  MAINTENANCE_BYPASS_QUERY_PARAM,
  MAINTENANCE_PATH,
  MAINTENANCE_RETRY_AFTER_SECONDS,
  isBypassTokenValid,
} from "./lib/maintenance";

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

// Matches UGC routes (Moments and Circles) with optional locale prefix.
// Used to gate AI training bots, which are allowed on generic pages but
// must not crawl user-generated content.
const ugcRouteRe = new RegExp(
  `^(?:\\/(?:${localeAlt}))?\\/(?:m|circles)\\/`
);

// Next.js metadata file routes (opengraph-image, twitter-image) — optional hash suffix
// e.g. /fr/circles/[slug]/opengraph-image-gwtces
const metadataFileRe = /\/(opengraph-image|twitter-image)(-[^/]+)?$/;

function matchesAny(ua: string, bots: readonly string[]): boolean {
  const lower = ua.toLowerCase();
  return bots.some((bot) => lower.includes(bot));
}

/**
 * Lit le flag de maintenance. Indépendant de la DB et fail-open : toute erreur
 * de lecture laisse passer le trafic (on ne coupe jamais le site à cause du
 * mécanisme lui-même).
 * - `MAINTENANCE_MODE=true` force la maintenance (override local/dev sans Edge Config)
 * - sinon, lecture de la clé `maintenance` dans Edge Config (preview/prod)
 */
async function isMaintenanceOn(): Promise<boolean> {
  if (process.env.MAINTENANCE_MODE === "true") return true;
  if (!process.env.EDGE_CONFIG) return false;
  try {
    return (await get<boolean>("maintenance")) === true;
  } catch {
    return false;
  }
}

export default async function middleware(request: NextRequest) {
  // 1. Block known aggressive bots early (Edge, zero serverless cost).
  // AI training bots are blocked only on user-generated content paths.
  const ua = request.headers.get("user-agent") ?? "";
  if (ua) {
    if (matchesAny(ua, AGGRESSIVE_CRAWLERS)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    if (
      matchesAny(ua, AI_TRAINING_BOTS) &&
      ugcRouteRe.test(request.nextUrl.pathname)
    ) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  // 2. Mode maintenance. Lu en tête (avant tout le reste) pour court-circuiter
  // le site lors d'un incident majeur. Webhook Stripe et `/api/*` sont hors
  // matcher → restent vivants. La page /maintenance est statique (zéro DB).
  if (await isMaintenanceOn()) {
    const expected = process.env.MAINTENANCE_BYPASS_TOKEN;
    const provided = request.nextUrl.searchParams.get(
      MAINTENANCE_BYPASS_QUERY_PARAM
    );

    // Activation du bypass via URL : pose le cookie, nettoie le paramètre,
    // puis recharge l'URL propre (le cookie portera l'accès aux requêtes suivantes).
    if (provided && isBypassTokenValid(provided, expected)) {
      const cleanUrl = request.nextUrl.clone();
      cleanUrl.searchParams.delete(MAINTENANCE_BYPASS_QUERY_PARAM);
      const response = NextResponse.redirect(cleanUrl);
      response.cookies.set(MAINTENANCE_BYPASS_COOKIE, provided, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: MAINTENANCE_BYPASS_COOKIE_MAX_AGE,
      });
      return response;
    }

    // Cookie de bypass déjà valide → on laisse passer (le maintainer voit le site).
    const cookie = request.cookies.get(MAINTENANCE_BYPASS_COOKIE)?.value;
    if (!isBypassTokenValid(cookie, expected)) {
      // Sert la page statique en 503 + Retry-After (crawlers et sondes uptime
      // comprennent que c'est temporaire).
      const maintenanceUrl = request.nextUrl.clone();
      maintenanceUrl.pathname = MAINTENANCE_PATH;
      return NextResponse.rewrite(maintenanceUrl, {
        status: 503,
        headers: { "Retry-After": String(MAINTENANCE_RETRY_AFTER_SECONDS) },
      });
    }
  }

  // 3. La route /maintenance est hors i18n : ne pas la passer à next-intl
  // (sinon préfixe de locale parasite). Atteinte en direct hors maintenance,
  // ou rendue via le rewrite ci-dessus.
  if (request.nextUrl.pathname === MAINTENANCE_PATH) {
    return NextResponse.next();
  }

  // 4. Bypass next-intl for Next.js metadata file routes. The i18n middleware
  // strips the default locale prefix (e.g. /fr/...) via a 307 redirect, which
  // drops the hash query string and breaks social crawlers (LinkedIn, X...)
  // that don't follow redirects on og:image URLs. Next.js file-based routing
  // still resolves these routes correctly without the middleware rewrite.
  if (metadataFileRe.test(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // 5. Validate slugs on public routes before any processing
  const slugMatch = request.nextUrl.pathname.match(slugRouteRe);
  if (slugMatch) {
    const slug = decodeURIComponent(slugMatch[1]);
    if (!isValidSlug(slug)) {
      return new NextResponse("Not Found", { status: 404 });
    }
  }

  // 6. Bounce shared dashboard event links to the public page for visitors
  // without a session, so they stay in the funnel instead of hitting sign-in.
  const dashboardEventPath = dashboardEventPublicPath(request.nextUrl.pathname);
  if (dashboardEventPath && !hasSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = dashboardEventPath;
    return NextResponse.redirect(url);
  }

  // 7. Delegate to next-intl middleware
  return intlMiddleware(request);
}

export const config = {
  // `embed(?:/|$)` (vs simple `embed`) évite de matcher des paths futurs
  // comme /embedded-foo qui ne sont pas l'app widget embed.
  //
  // `149e9513-01fa-4fb0-aad4-566afd725d1b` = préfixe proxy FIXE de Vercel BotID
  // (challenge servi en first-party via les rewrites de withBotId, cf.
  // next.config.ts). Les chemins du challenge AVEC extension (.js) sont déjà
  // exclus par `.*\\..*`, mais ses appels proxy SANS extension étaient captés
  // par next-intl et renvoyés en 404 — cassant le challenge (faux positifs +
  // latence au sign-in pour tous). Le matcher doit être un littéral statique
  // (analysé au build), d'où l'UUID en dur. Constante documentée par Vercel.
  matcher: [
    "/((?!api|_next|_vercel|monitoring|ingest|icon|embed(?:/|$)|149e9513-01fa-4fb0-aad4-566afd725d1b|.*\\..*).*)",
  ],
};

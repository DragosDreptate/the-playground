import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getTranslations } from "next-intl/server";
import {
  prismaCircleRepository,
  prismaMomentRepository,
} from "@/infrastructure/repositories";
import { getCircleCalendarMoments } from "@/domain/usecases/get-circle-calendar-moments";
import { routing, isSupportedLocale, type Locale } from "@/i18n/routing";
import { isCircleIndexable } from "@/lib/seo";
import { isValidSlug } from "@/lib/slug";
import { getAppUrl } from "@/lib/app-url";
import { isBotBlockedOnUgc } from "@/lib/blocked-bots";
import { buildCircleCalendarFeed } from "./build-circle-calendar-feed";

// Les agendas abonnés et les agrégateurs relisent le flux en boucle. Le cache
// serveur (une heure), indexé sur (slug, langue) seulement, protège la base
// même si l'URL varie. Volontairement pas de cache CDN : il servirait la
// réponse sans repasser par la fonction, donc sans le blocage des robots d'IA
// ci-dessous (la route est hors du middleware).
const FEED_CACHE_SECONDS = 3600;

async function loadFeed(slug: string, locale: Locale): Promise<string | null> {
  const circle = await prismaCircleRepository.findBySlug(slug);
  // Communauté privée ou de démo : pas de flux, comme pour l'indexation.
  if (!circle || !isCircleIndexable(circle)) return null;

  const [moments, t] = await Promise.all([
    getCircleCalendarMoments(circle.id, { momentRepository: prismaMomentRepository }),
    getTranslations({ locale, namespace: "Circle.calendarFeed" }),
  ]);

  return buildCircleCalendarFeed({
    circleName: circle.name,
    moments,
    appUrl: getAppUrl(),
    locale,
    labels: {
      registerLine: (url) => t("feedRegisterLine", { url }),
      online: t("feedOnline"),
    },
  });
}

function getCachedFeed(slug: string, locale: Locale): Promise<string | null> {
  return unstable_cache(
    () => loadFeed(slug, locale),
    ["circle-calendar-feed", slug, locale],
    { revalidate: FEED_CACHE_SECONDS }
  )();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!isValidSlug(slug)) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (isBotBlockedOnUgc(request.headers.get("user-agent"))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const requestedLocale = new URL(request.url).searchParams.get("locale") ?? "";
  const locale = isSupportedLocale(requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;

  const ics = await getCachedFeed(slug, locale);
  if (!ics) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${slug}.ics"`,
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

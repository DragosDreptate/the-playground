import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/infrastructure/auth/auth.config";
import { prismaUserRepository } from "@/infrastructure/repositories";
import { setPreferredLocale } from "@/domain/usecases/set-preferred-locale";
import { isSupportedLocale } from "@/i18n/routing";

/**
 * POST /api/preferred-locale — appelée par le sélecteur FR/EN : la langue
 * choisie devient celle des emails de l'utilisateur connecté.
 *
 * Route API plutôt que server action, volontairement :
 * - hors du middleware next-intl (`/api` est exclu du matcher) : une requête
 *   traitée par lui pendant un changement de langue réécrivait le cookie
 *   NEXT_LOCALE et ramenait l'interface dans l'ancienne langue ;
 * - hors de la file d'attente du routeur : le sélecteur l'appelle sans
 *   l'attendre, le changement de page n'est jamais retardé par la base.
 *
 * Exige un corps JSON (déclenche un preflight CORS en cross-origin) et la
 * session de l'appelant : on ne peut changer que SA propre langue.
 */
export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return new NextResponse(null, { status: 415 });
  }

  const session = await auth();
  if (!session?.user?.id) return new NextResponse(null, { status: 401 });

  const body = (await request.json().catch(() => null)) as { locale?: unknown } | null;
  const locale = body?.locale;
  if (typeof locale !== "string" || !isSupportedLocale(locale)) {
    return new NextResponse(null, { status: 400 });
  }

  // Rien à écrire si la langue enregistrée est déjà la bonne.
  if (session.user.preferredLocale !== locale) {
    try {
      await setPreferredLocale(session.user.id, locale, {
        userRepository: prismaUserRepository,
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { context: "preferred_locale_switch" } });
      return new NextResponse(null, { status: 500 });
    }
  }

  return new NextResponse(null, { status: 204 });
}

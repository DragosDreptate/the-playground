import { routing, isSupportedLocale, type Locale } from "@/i18n/routing";

const NEXT_LOCALE_COOKIE = /(?:^|;\s*)NEXT_LOCALE=([^;]+)/;

/**
 * Détecte la locale à utiliser pour le contenu de l'email magic link.
 *
 * Ordre de détection :
 *   1. Prefix `/fr/` ou `/en/` du `callbackUrl` (présent dans l'URL Auth.js)
 *   2. Cookie `NEXT_LOCALE`
 *   3. Header `Accept-Language`
 *   4. Fallback `defaultLocale`
 *
 * Le `callbackUrl` est par construction le signal le plus fiable : il vient
 * du parcours produit lui-même. Le cookie `NEXT_LOCALE` n'est pas toujours
 * set par next-intl quand l'utilisateur est sur la locale par défaut, et le
 * header `Accept-Language` reflète la config système du navigateur (ex:
 * Windows en EN avec interface FR → header `en-*` alors que l'UI était en FR).
 */
export function detectLocaleForMagicLink(authJsUrl: string, request: Request): Locale {
  const fromCallback = extractLocaleFromCallbackUrl(authJsUrl);
  if (fromCallback) return fromCallback;
  return detectLocaleFromRequest(request);
}

function extractLocaleFromCallbackUrl(authJsUrl: string): Locale | null {
  try {
    const callbackUrl = new URL(authJsUrl).searchParams.get("callbackUrl");
    if (!callbackUrl) return null;
    const pathname = callbackUrl.startsWith("http")
      ? new URL(callbackUrl).pathname
      : callbackUrl;
    const firstSegment = pathname.split("/").filter(Boolean)[0];
    return firstSegment && isSupportedLocale(firstSegment) ? firstSegment : null;
  } catch {
    return null;
  }
}

function detectLocaleFromRequest(request: Request): Locale {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(NEXT_LOCALE_COOKIE);
  if (match && isSupportedLocale(match[1])) return match[1];

  const accept = request.headers.get("accept-language") ?? "";
  const fromHeader = routing.locales.find((l) => accept.toLowerCase().startsWith(l));
  return fromHeader ?? routing.defaultLocale;
}


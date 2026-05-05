import { routing } from "@/i18n/routing";

type Locale = (typeof routing.locales)[number];

const NEXT_LOCALE_COOKIE = /(?:^|;\s*)NEXT_LOCALE=([^;]+)/;

/**
 * Convertit l'URL de callback générée par Auth.js (Resend provider) en URL
 * pointant vers la page applicative `/auth/confirm`. Cette indirection évite
 * que les scanners email (Defender Safe Links, Mimecast…) consument le token
 * en prefetchant le lien : la page intermédiaire est inerte, seul le bouton
 * cliqué par l'utilisateur déclenche le POST qui valide le token.
 */
export function buildMagicLinkConfirmUrl(authJsUrl: string, request: Request): string {
  const original = new URL(authJsUrl);
  const locale = detectLocale(request);
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  const confirm = new URL(`${prefix}/auth/confirm`, original.origin);
  confirm.search = original.search;
  return confirm.toString();
}

function detectLocale(request: Request): Locale {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(NEXT_LOCALE_COOKIE);
  if (match && isSupportedLocale(match[1])) return match[1];

  const accept = request.headers.get("accept-language") ?? "";
  const fromHeader = routing.locales.find((l) => accept.toLowerCase().startsWith(l));
  return fromHeader ?? routing.defaultLocale;
}

function isSupportedLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value);
}

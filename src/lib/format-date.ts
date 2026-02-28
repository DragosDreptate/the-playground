/**
 * Date formatting utilities.
 *
 * All dates are formatted in the Europe/Paris timezone via `Intl.DateTimeFormat`,
 * ensuring consistency between server-side rendering (Vercel/UTC) and
 * client-side rendering (browser locale). Using an explicit timezone eliminates
 * SSR hydration mismatches.
 *
 * For a France-first app, Europe/Paris is the appropriate default.
 */

const TIMEZONE = "Europe/Paris";

type IntlLocaleKey = "fr" | "en" | "ro" | "nl" | "es";
const INTL_LOCALES: Record<IntlLocaleKey, string> = {
  fr: "fr-FR",
  en: "en-GB",
  ro: "ro-RO",
  nl: "nl-NL",
  es: "es-ES",
};

function toIntlLocale(locale: string): string {
  return INTL_LOCALES[locale as IntlLocaleKey] ?? locale;
}

/** "22:00" (toujours 24h, fuseau Europe/Paris) */
export function formatTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

/** "sam. 25 févr." / "Sat 25 Feb" */
export function formatShortDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    timeZone: TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

/** "25 févr." / "28 Feb" */
export function formatDayMonth(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "short",
  }).format(date);
}

/** { weekday, dateStr } pour les timelines — "sam." + "28 févr. 2026" */
export function formatWeekdayAndDate(
  date: Date,
  locale: string,
): { weekday: string; dateStr: string } {
  const intlLocale = toIntlLocale(locale);
  const weekday = new Intl.DateTimeFormat(intlLocale, {
    timeZone: TIMEZONE,
    weekday: "short",
  }).format(date);
  const dateStr = new Intl.DateTimeFormat(intlLocale, {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
  return { weekday, dateStr };
}

/** Retourne true si deux dates tombent le même jour calendaire (fuseau Europe/Paris) */
export function isSameDayInParis(a: Date, b: Date): boolean {
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(a) === fmt.format(b);
}

/** "25 février 2026" / "25 February 2026" */
export function formatLongDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** "sam. 25 févr. · 22:00 – 23:00" */
export function formatDateRange(
  startsAt: Date,
  endsAt: Date | null,
  locale: string,
): string {
  const dateStr = formatShortDate(startsAt, locale);
  const startTime = formatTime(startsAt);
  if (!endsAt) return `${dateStr} · ${startTime}`;
  const endTime = formatTime(endsAt);
  return `${dateStr} · ${startTime} – ${endTime}`;
}

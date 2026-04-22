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

/** Heure formatée selon la locale de l'utilisateur ("22:00" en FR/EN-GB, "10:00 PM" en EN-US) */
export function formatLocalizedTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

/** { weekday, dateStr } pour les timelines — "sam." + "28 févr." */
export function formatWeekdayAndDate(
  date: Date,
  locale: string,
): { weekday: string; dateStr: string } {
  const intlLocale = toIntlLocale(locale);
  const weekday = new Intl.DateTimeFormat(intlLocale, {
    timeZone: TIMEZONE,
    weekday: "short",
  }).format(date);
  const dateStr = formatDayMonth(date, locale);
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

/** "mars 2025" / "March 2025" — utilisé pour les dates de type "Membre depuis" */
export function formatMonthYear(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    timeZone: TIMEZONE,
    month: "long",
    year: "numeric",
  }).format(date);
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

/** "mardi 21 avril" / "Tuesday 21 April" */
export function formatLongDateWithWeekday(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

/** "sam. 25 févr. · 22:00 – 23:00" (same-day) ou "sam. 25 févr. – dim. 26 févr. · 22:00 – 02:00" (multi-jour) */
export function formatDateRange(
  startsAt: Date,
  endsAt: Date | null,
  locale: string,
): string {
  const startDate = formatShortDate(startsAt, locale);
  const startTime = formatTime(startsAt);
  if (!endsAt) return `${startDate} · ${startTime}`;
  const endTime = formatTime(endsAt);
  if (!isSameDayInParis(startsAt, endsAt)) {
    const endDate = formatShortDate(endsAt, locale);
    return `${startDate} – ${endDate} · ${startTime} – ${endTime}`;
  }
  return `${startDate} · ${startTime} – ${endTime}`;
}

/**
 * Affichage meta "Quand" sur la page événement — 2 lignes (date bold, heure muted).
 *
 * - Pas de `endsAt`       → `{ dateLine: "mardi 22 avril", timeLine: "15:00" }`
 * - Même jour (Paris)     → `{ dateLine: "mardi 22 avril", timeLine: "15:00 – 17:00" }`
 * - Jours différents      → `{ dateLine: "mar. 22 avril – mer. 23 avril", timeLine: "22:00 – 02:00" }`
 */
export function formatMomentDateTime(
  startsAt: Date,
  endsAt: Date | null,
  locale: string,
): { dateLine: string; timeLine: string } {
  const startTime = formatLocalizedTime(startsAt, locale);
  if (!endsAt) {
    return {
      dateLine: formatLongDateWithWeekday(startsAt, locale),
      timeLine: startTime,
    };
  }
  const endTime = formatLocalizedTime(endsAt, locale);
  if (!isSameDayInParis(startsAt, endsAt)) {
    return {
      dateLine: `${formatShortDate(startsAt, locale)} – ${formatShortDate(endsAt, locale)}`,
      timeLine: `${startTime} – ${endTime}`,
    };
  }
  return {
    dateLine: formatLongDateWithWeekday(startsAt, locale),
    timeLine: `${startTime} – ${endTime}`,
  };
}

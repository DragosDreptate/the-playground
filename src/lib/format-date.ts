import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { enUS } from "date-fns/locale/en-US";
import type { Locale } from "date-fns";

export function getDateFnsLocale(locale: string): Locale {
  return locale === "fr" ? fr : enUS;
}

/** "sam. 25 févr." / "Sat 25 Feb" */
export function formatShortDate(date: Date, locale: string): string {
  return format(date, "EEE d MMM", { locale: getDateFnsLocale(locale) });
}

/** "22:00" (toujours 24h, pas de dépendance à l'API Intl) */
export function formatTime(date: Date): string {
  return format(date, "HH:mm");
}

/** "25 févr." / "25 Feb" */
export function formatDayMonth(date: Date, locale: string): string {
  return format(date, "d MMM", { locale: getDateFnsLocale(locale) });
}

/** "sam. 25 févr." + weekday séparé, pour les timelines */
export function formatWeekdayAndDate(
  date: Date,
  locale: string,
): { weekday: string; dateStr: string } {
  const dateFnsLocale = getDateFnsLocale(locale);
  return {
    weekday: format(date, "EEE", { locale: dateFnsLocale }),
    dateStr: format(date, "d MMM yyyy", { locale: dateFnsLocale }),
  };
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

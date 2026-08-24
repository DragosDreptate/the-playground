/**
 * Date formatting utilities.
 *
 * Chaque helper reçoit un fuseau **explicite** (identifiant IANA) : il n'y a plus de
 * fuseau de plateforme codé en dur. Selon la surface, l'appelant passe le fuseau du
 * VISITEUR (affichage web, via `useVisitorTimezone`) ou celui de l'ÉVÉNEMENT (rendus
 * serveur sans visiteur : emails, image OG, et repli avant hydratation).
 *
 * Le paramètre est requis partout, pour qu'aucune surface ne retombe silencieusement
 * sur un fuseau par défaut qui serait faux hors de France.
 *
 * Voir spec/decisions/0008-fuseau-horaire-affichage-visiteur.md
 */

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

/**
 * Le CLDR récent rend September « Sept » (4 lettres) en anglais, là où l'usage attend
 * « Sep » (3 lettres, comme tous les autres mois abrégés). On l'uniformise pour garder
 * une largeur de mois homogène sur toutes les surfaces (desktop, mobile, og:image).
 */
function normalizeShortMonthEn(formatted: string, locale: string): string {
  return locale.startsWith("en") ? formatted.replace(/\bSept\b/g, "Sep") : formatted;
}

/** "22:00" (toujours 24h, fuseau Europe/Paris) */
export function formatTime(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

/** Heure formatée selon la locale de l'utilisateur ("22:00" en FR/EN-GB, "10:00 PM" en EN-US) */
export function formatLocalizedTime(date: Date, locale: string, timezone: string): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** "sam. 25 févr." / "Sat 25 Feb" */
export function formatShortDate(date: Date, locale: string, timezone: string): string {
  return normalizeShortMonthEn(
    new Intl.DateTimeFormat(toIntlLocale(locale), {
      timeZone: timezone,
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(date),
    locale,
  );
}

/** "25 févr." / "28 Feb" */
export function formatDayMonth(date: Date, locale: string, timezone: string): string {
  return normalizeShortMonthEn(
    new Intl.DateTimeFormat(toIntlLocale(locale), {
      timeZone: timezone,
      day: "numeric",
      month: "short",
    }).format(date),
    locale,
  );
}

/**
 * "25 fév." / "28 Feb" — variante compacte de formatDayMonth pour les colonnes de
 * timeline étroites (mobile) : abréviations FR ramenées à 3 lettres + point ("sept."
 * → "sep."). Les mois écrits en toutes lettres (mars, mai, juin, août) restent
 * intacts ; juillet reste "juil." (à "jui." il collisionnerait avec juin).
 */
export function formatDayMonthShort(date: Date, locale: string, timezone: string): string {
  const intlLocale = toIntlLocale(locale);
  const day = new Intl.DateTimeFormat(intlLocale, { timeZone: timezone, day: "numeric" }).format(date);
  const month = normalizeShortMonthEn(
    new Intl.DateTimeFormat(intlLocale, { timeZone: timezone, month: "short" }).format(date),
    locale,
  );
  // Mots complets (mars, mai, juin, août, EN « Sep »…) : laissés tels quels, sans point.
  // Abréviations FR (terminées par « . ») : tronquées à 3 lettres + point, sauf juillet.
  let shortMonth = month;
  if (month.endsWith(".")) {
    const base = month.slice(0, -1);
    shortMonth = /^juil/i.test(base) ? `${base}.` : `${base.slice(0, 3)}.`;
  }
  return `${day} ${shortMonth}`;
}

/** { weekday, dateStr } pour les timelines — "sam." + "28 févr." */
export function formatWeekdayAndDate(
  date: Date,
  locale: string,
  timezone: string,
): { weekday: string; dateStr: string } {
  const intlLocale = toIntlLocale(locale);
  const weekday = new Intl.DateTimeFormat(intlLocale, {
    timeZone: timezone,
    weekday: "short",
  }).format(date);
  const dateStr = formatDayMonth(date, locale, timezone);
  return { weekday, dateStr };
}

/** Retourne true si deux dates tombent le même jour calendaire dans `timezone`. */
export function isSameDayInTimezone(a: Date, b: Date, timezone: string): boolean {
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(a) === fmt.format(b);
}

/** "mars 2025" / "March 2025" — utilisé pour les dates de type "Membre depuis" */
export function formatMonthYear(date: Date, locale: string, timezone: string): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    timeZone: timezone,
    month: "long",
    year: "numeric",
  }).format(date);
}

/** "25 février 2026" / "25 February 2026" */
export function formatLongDate(date: Date, locale: string, timezone: string): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    timeZone: timezone,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** "mardi 21 avril" / "Tuesday 21 April" */
export function formatLongDateWithWeekday(date: Date, locale: string, timezone: string): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    timeZone: timezone,
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
  timezone: string,
): string {
  const startDate = formatShortDate(startsAt, locale, timezone);
  const startTime = formatTime(startsAt, timezone);
  if (!endsAt) return `${startDate} · ${startTime}`;
  const endTime = formatTime(endsAt, timezone);
  if (!isSameDayInTimezone(startsAt, endsAt, timezone)) {
    const endDate = formatShortDate(endsAt, locale, timezone);
    return `${startDate} – ${endDate} · ${startTime} – ${endTime}`;
  }
  return `${startDate} · ${startTime} – ${endTime}`;
}

/**
 * Composantes typographiques utilisées par les og:image (date pill + meta) :
 * mois & jour pour la pill blanche, weekday + heure pour la ligne meta.
 * Tout en uppercase, sans le point final que `Intl` ajoute parfois en FR.
 *
 * L'image est générée côté serveur, sans visiteur : elle est rendue dans le fuseau
 * de l'ÉVÉNEMENT, d'où le paramètre explicite. Voir ADR-0008.
 */
export function formatOgDateBadge(
  date: Date,
  locale: string,
  timezone: string,
): { month: string; day: string; weekday: string; time: string } {
  const intlLocale = toIntlLocale(locale);
  const stripDot = (s: string) => s.replace(/\.$/, "").toUpperCase();
  return {
    month: stripDot(
      normalizeShortMonthEn(
        new Intl.DateTimeFormat(intlLocale, {
          timeZone: timezone,
          month: "short",
        }).format(date),
        locale,
      ),
    ),
    day: new Intl.DateTimeFormat(intlLocale, {
      timeZone: timezone,
      day: "numeric",
    }).format(date),
    weekday: stripDot(
      new Intl.DateTimeFormat(intlLocale, {
        timeZone: timezone,
        weekday: "short",
      }).format(date),
    ),
    time: new Intl.DateTimeFormat(intlLocale, {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
}

/**
 * Affichage meta "Quand" sur la page événement — toujours 2 lignes.
 *
 * - Pas de `endsAt`       → `{ line1: "mardi 22 avril", line2: "15:00", isMultiDay: false }`
 * - Même jour (Paris)     → `{ line1: "mardi 22 avril", line2: "15:00 – 17:00", isMultiDay: false }`
 * - Jours différents      → `{ line1: "dim. 25 janv. · 22:00", line2: "lun. 26 janv. · 02:00", isMultiDay: true }`
 *
 * Le flag `isMultiDay` permet au composant d'adapter la typo : hiérarchie bold/muted en
 * single-day, 2 lignes équivalentes bold en multi-day.
 */
export function formatMomentDateTime(
  startsAt: Date,
  endsAt: Date | null,
  locale: string,
  timezone: string,
): { line1: string; line2: string; isMultiDay: boolean } {
  const startTime = formatLocalizedTime(startsAt, locale, timezone);
  if (!endsAt) {
    return {
      line1: formatLongDateWithWeekday(startsAt, locale, timezone),
      line2: startTime,
      isMultiDay: false,
    };
  }
  const endTime = formatLocalizedTime(endsAt, locale, timezone);
  if (!isSameDayInTimezone(startsAt, endsAt, timezone)) {
    return {
      line1: `${formatShortDate(startsAt, locale, timezone)} · ${startTime}`,
      line2: `${formatShortDate(endsAt, locale, timezone)} · ${endTime}`,
      isMultiDay: true,
    };
  }
  return {
    line1: formatLongDateWithWeekday(startsAt, locale, timezone),
    line2: `${startTime} – ${endTime}`,
    isMultiDay: false,
  };
}

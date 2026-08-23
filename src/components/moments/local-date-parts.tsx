"use client";

import { useTranslations } from "next-intl";
import {
  formatTime,
  formatLongDate,
  formatLocalizedTime,
  formatShortDate,
  formatWeekdayAndDate,
  formatDayMonthShort,
  formatDateRange,
  formatMomentDateTime,
  isSameDayInTimezone,
} from "@/lib/format-date";
import { useVisitorTimezone } from "@/lib/use-visitor-timezone";

/**
 * Fragments de date rendus **dans le fuseau du visiteur**.
 *
 * Ces composants existent pour que les pages et cartes restent des server components :
 * seule la date bascule côté client, pas le sous-arbre entier. Convertir les parents
 * en `"use client"` coûterait du bundle et de l'hydratation sur des vues qui n'ont
 * aucune autre interactivité.
 *
 * Tant que le fuseau du visiteur n'est pas connu (rendu serveur, puis hydratation),
 * l'heure de l'ÉVÉNEMENT est affichée. Quand les deux coïncident — le cas courant —
 * rien ne bouge à l'écran ; sinon l'heure s'ajuste au montage.
 *
 * Voir spec/decisions/0008-fuseau-horaire-affichage-visiteur.md
 */

type BaseProps = {
  startsAt: Date;
  eventTimezone: string;
  locale: string;
};

function useResolvedTimezone(eventTimezone: string): {
  timezone: string;
  visitorTimezone: string | null;
} {
  const visitorTimezone = useVisitorTimezone();
  return { timezone: visitorTimezone ?? eventTimezone, visitorTimezone };
}

/** "22:00" */
export function LocalTime({ startsAt, eventTimezone, locale: _locale }: BaseProps) {
  const { timezone } = useResolvedTimezone(eventTimezone);
  return <>{formatTime(startsAt, timezone)}</>;
}

/** "25 février 2026 · 20:00" — widget embarqué sur un site externe. */
export function LocalLongDateTime({ startsAt, eventTimezone, locale }: BaseProps) {
  const { timezone } = useResolvedTimezone(eventTimezone);
  return (
    <>
      {formatLongDate(startsAt, locale, timezone)} ·{" "}
      {formatLocalizedTime(startsAt, locale, timezone)}
    </>
  );
}

/** "sam. 25 févr." */
export function LocalShortDate({ startsAt, eventTimezone, locale }: BaseProps) {
  const { timezone } = useResolvedTimezone(eventTimezone);
  return <>{formatShortDate(startsAt, locale, timezone)}</>;
}

/** "sam. 25 févr. · 22:00 – 23:00" */
export function LocalDateRange({
  startsAt,
  endsAt,
  eventTimezone,
  locale,
}: BaseProps & { endsAt: Date | null }) {
  const { timezone } = useResolvedTimezone(eventTimezone);
  return <>{formatDateRange(startsAt, endsAt, locale, timezone)}</>;
}

/** Bloc "Quand" de la page événement — toujours 2 lignes. */
export function LocalMomentDateTime({
  startsAt,
  endsAt,
  eventTimezone,
  locale,
  line1ClassName,
  line2ClassName,
  line2MultiDayClassName,
}: BaseProps & {
  endsAt: Date | null;
  line1ClassName?: string;
  line2ClassName?: string;
  /** Appliquée à la place de `line2ClassName` quand l'événement s'étale sur plusieurs jours. */
  line2MultiDayClassName?: string;
}) {
  const { timezone } = useResolvedTimezone(eventTimezone);
  const { line1, line2, isMultiDay } = formatMomentDateTime(
    startsAt,
    endsAt,
    locale,
    timezone,
  );
  return (
    <>
      <p className={line1ClassName}>{line1}</p>
      <p className={isMultiDay ? line2MultiDayClassName : line2ClassName}>{line2}</p>
    </>
  );
}

/**
 * Colonne de date des timelines : badge « Aujourd'hui », ou jour de semaine + date,
 * puis l'heure en mobile.
 *
 * « Aujourd'hui » suit le fuseau du VISITEUR et n'est calculé qu'une fois celui-ci
 * connu — revirement assumé de la correction de juillet 2026, qui l'ancrait sur
 * Europe/Paris. Le calcul reste client-only : sur du contenu ISR figé, « aujourd'hui »
 * ne peut pas être décidé côté serveur sans mentir au passage de minuit.
 */
export function LocalTimelineDateColumn({
  startsAt,
  eventTimezone,
  locale,
  isPast = false,
}: BaseProps & { isPast?: boolean }) {
  const tCircle = useTranslations("Circle");
  const { timezone, visitorTimezone } = useResolvedTimezone(eventTimezone);

  const isToday = visitorTimezone
    ? isSameDayInTimezone(startsAt, new Date(), visitorTimezone)
    : false;
  const { weekday, dateStr } = formatWeekdayAndDate(startsAt, locale, timezone);
  const dateStrShort = formatDayMonthShort(startsAt, locale, timezone);
  const timeStr = formatTime(startsAt, timezone);

  return (
    <div className="w-[55px] shrink-0 pr-1 pt-1 text-right sm:w-[100px] sm:pr-4">
      {isToday ? (
        <span className="bg-primary text-primary-foreground inline-block rounded-full px-2 py-0.5 text-xs font-semibold">
          <span className="sm:hidden">{tCircle("detail.todayShort")}</span>
          <span className="hidden sm:inline">{tCircle("detail.today")}</span>
        </span>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">{weekday}</p>
          <p className="text-sm font-medium leading-snug">
            <span className="sm:hidden">{dateStrShort}</span>
            <span className="hidden sm:inline">{dateStr}</span>
          </p>
        </>
      )}
      <p
        className={`mt-0.5 text-xs sm:hidden ${
          isPast ? "text-muted-foreground/60" : "text-muted-foreground"
        }`}
      >
        {timeStr}
      </p>
    </div>
  );
}

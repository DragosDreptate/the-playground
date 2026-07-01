/**
 * Helpers de catégorisation et de tri des événements (Moments) dans les
 * timelines des pages Circle (publique et dashboard).
 *
 * Règle métier : un événement annulé (CANCELLED) reste rattaché à l'agenda
 * « à venir » tant que sa date n'est pas passée — affiché barré. Une fois sa
 * date dépassée, il rejoint l'historique « passés ».
 *
 * Types structurels (pas d'import du domaine) pour rester un util pur : `lib/`
 * ne dépend de rien.
 */

type DatedMoment = { status: string; startsAt: Date };

/** Un événement annulé encore daté dans le futur : appartient à l'agenda à venir. */
export function isUpcomingCancelled(moment: DatedMoment, now: number): boolean {
  return moment.status === "CANCELLED" && moment.startsAt.getTime() > now;
}

/** Un événement appartenant à l'historique : passé, ou annulé dont la date est passée. */
export function isPastMoment(moment: DatedMoment, now: number): boolean {
  return (
    moment.status === "PAST" ||
    (moment.status === "CANCELLED" && moment.startsAt.getTime() <= now)
  );
}

/** Comparateur antichronologique : le plus récent d'abord. */
export function byStartsAtDesc(a: { startsAt: Date }, b: { startsAt: Date }): number {
  return b.startsAt.getTime() - a.startsAt.getTime();
}

/**
 * Répartit des lignes en « à venir » / « passés » selon la règle timeline
 * (isPastMoment). `getMoment` extrait le statut + la date de chaque ligne. Source
 * unique de la logique de bucketing, partagée par les requêtes dashboard host et
 * participant (l'ordre d'entrée est préservé dans chaque groupe).
 */
export function partitionUpcomingPast<T>(
  rows: readonly T[],
  getMoment: (row: T) => DatedMoment,
  now: number
): { upcoming: T[]; past: T[] } {
  const upcoming: T[] = [];
  const past: T[] = [];
  for (const row of rows) {
    if (isPastMoment(getMoment(row), now)) past.push(row);
    else upcoming.push(row);
  }
  return { upcoming, past };
}

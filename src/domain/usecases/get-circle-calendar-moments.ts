import type { Moment } from "@/domain/models/moment";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";

/**
 * Les événements passés restent dans le flux pendant cette durée : sans ça,
 * ils disparaîtraient de l'agenda des abonnés dès qu'ils ont eu lieu.
 */
export const CALENDAR_FEED_PAST_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

type GetCircleCalendarMomentsDeps = {
  momentRepository: MomentRepository;
};

/**
 * Événements d'une Communauté publiés dans son flux calendrier : à venir,
 * passés depuis moins de 90 jours, annulés compris (l'agenda de l'abonné les
 * retire), jamais de brouillon. L'éligibilité de la Communauté (publique et
 * réelle) est vérifiée par l'appelant.
 */
export async function getCircleCalendarMoments(
  circleId: string,
  deps: GetCircleCalendarMomentsDeps,
  now: Date = new Date()
): Promise<Moment[]> {
  const cutoff = now.getTime() - CALENDAR_FEED_PAST_DAYS * DAY_MS;
  const moments = await deps.momentRepository.findByCircleId(circleId);
  return moments.filter(
    (moment) => moment.status !== "DRAFT" && moment.startsAt.getTime() >= cutoff
  );
}

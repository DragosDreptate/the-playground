/**
 * Service de calcul du score Explorer.
 *
 * Score interne non exposé aux utilisateurs — sert uniquement au tri sur la page Explorer.
 * Recalculé chaque nuit via un batch (Vercel Cron) et persisté en DB.
 *
 * Ref : spec/feature-explorer-rating.md
 */

export type CircleScoreInput = {
  description: string;
  coverImage: string | null;
  category: string | null;
  createdAt: Date;
  isDemo: boolean;
  overrideScore: number | null;
  memberCount: number; // membres hors host (role PLAYER uniquement)
  pastEventCount: number; // nombre d'événements passés (status PAST)
  hasPastEventWithRegistrant: boolean; // au moins 1 event passé avec ≥ 1 inscrit
  hasUpcomingEvent: boolean; // au moins 1 event PUBLISHED + startsAt > now
};

export type MomentScoreInput = {
  description: string;
  coverImage: string | null;
  locationName: string | null;
  registrantCount: number; // inscriptions avec status REGISTERED
  circleScore: number; // score déjà calculé du Circle parent (0–100)
  circleIsDemo: boolean;
};

const CIRCLE_RAW_MAX = 205;

/**
 * Calcule le score Explorer d'une Communauté (0–100).
 *
 * Si `overrideScore` est non-null, il est retourné directement sans calcul.
 * Si `isDemo`, le score est plafonné à 30.
 */
export function calculateCircleScore(input: CircleScoreInput): number {
  if (input.overrideScore !== null) {
    return input.overrideScore;
  }

  const ageInDays =
    (Date.now() - input.createdAt.getTime()) / (1000 * 60 * 60 * 24);

  const rawScore =
    (input.hasPastEventWithRegistrant ? 20 : 0) +
    (input.coverImage !== null ? 18 : 0) +
    (input.hasUpcomingEvent ? 15 : 0) +
    (input.description.trim().length >= 30 ? 10 : 0) +
    (input.category !== null ? 7 : 0) +
    (ageInDays >= 1 ? 5 : 0) +
    Math.min(input.memberCount * 8, 80) +
    Math.min(input.pastEventCount * 10, 50);

  const score = Math.round((rawScore / CIRCLE_RAW_MAX) * 100);

  return input.isDemo ? Math.min(score, 30) : score;
}

/**
 * Calcule le score Explorer d'un événement (0–100).
 *
 * Score = 50 % score Communauté parente + 50 % signaux propres à l'événement.
 * Si le Circle est une démo (`circleIsDemo`), le score est plafonné à 30.
 */
export function calculateMomentScore(input: MomentScoreInput): number {
  const momentRaw =
    Math.min(input.registrantCount * 7, 70) +
    (input.coverImage !== null ? 15 : 0) +
    (input.description.trim().length >= 30 ? 10 : 0) +
    (input.locationName !== null ? 5 : 0);

  const score = Math.round(input.circleScore * 0.5 + momentRaw * 0.5);

  return input.circleIsDemo ? Math.min(score, 30) : score;
}

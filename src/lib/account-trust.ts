/**
 * Confiance liée à l'ancienneté d'un compte.
 *
 * Helper pur (sans dépendance infra) : sert à durcir les actions à fort
 * potentiel de nuisance (contacter les organisateurs, commenter) pour les
 * comptes très récents, qui sont le profil typique d'un abus « créer un compte,
 * frapper tout de suite, recommencer ». `now` est passé explicitement pour
 * rester déterministe et testable.
 */

export const NEW_ACCOUNT_WINDOW_HOURS = 24;
export const NEW_ACCOUNT_WINDOW_MS = NEW_ACCOUNT_WINDOW_HOURS * 60 * 60 * 1000;

/**
 * Vrai si le compte a été créé il y a moins de `NEW_ACCOUNT_WINDOW_MS`.
 *
 * `createdAt` est coercé via `new Date(...)` : côté domaine c'est un vrai `Date`
 * (mapping Prisma), mais côté session NextAuth il arrive sérialisé en string
 * après le passage RSC. On accepte donc Date | string | number.
 */
export function isNewAccount(createdAt: Date | string | number, now: Date): boolean {
  return now.getTime() - new Date(createdAt).getTime() < NEW_ACCOUNT_WINDOW_MS;
}

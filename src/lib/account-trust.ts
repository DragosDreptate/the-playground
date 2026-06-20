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
 *
 * **Fail-closed** : un `createdAt` invalide (`NaN`) est traité comme « nouveau »
 * → le gate s'applique. Pour un gate de sécurité, mieux vaut bloquer dans le
 * doute que laisser passer (le cas est en pratique inatteignable, `createdAt`
 * étant non-null garanti).
 */
export function isNewAccount(createdAt: Date | string | number, now: Date): boolean {
  const createdMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdMs)) return true;
  return now.getTime() - createdMs < NEW_ACCOUNT_WINDOW_MS;
}

/**
 * Variante au niveau session : vrai si l'utilisateur connecté a un compte de
 * moins de 24h. Centralise le calcul utilisé par les pages qui anticipent le
 * gate (grisé du bouton « Contacter l'organisateur »), avec un guard uniforme
 * sur l'absence de session. Type structurel pour rester découplé de NextAuth.
 */
export function isSessionAccountNew(
  session: { user?: { createdAt: number } } | null | undefined
): boolean {
  return !!session?.user && isNewAccount(session.user.createdAt, new Date());
}

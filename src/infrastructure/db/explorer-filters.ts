/**
 * Filtres Prisma partagés pour la page Explorer.
 *
 * Centralise les règles d'exclusion appliquées dans les repositories Explorer
 * et la cron route de recalcul des scores.
 */

/** Suffixe email des comptes de test — jamais affichés sur Explorer. */
export const TEST_EMAIL_SUFFIX = "@test.playground";

/**
 * Retourne le filtre Prisma excluant les Circles dont le Host est un compte de test.
 * À combiner dans le champ `NOT` d'un `circle.findMany()`.
 */
export function excludeTestHostFilter() {
  return {
    memberships: {
      some: {
        role: "HOST" as const,
        user: { email: { endsWith: TEST_EMAIL_SUFFIX } },
      },
    },
  };
}

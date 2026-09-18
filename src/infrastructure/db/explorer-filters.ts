/**
 * Filtres Prisma partagés pour la page Explorer.
 *
 * Centralise les règles d'exclusion appliquées dans les repositories Explorer
 * et la cron route de recalcul des scores.
 */

export { TEST_EMAIL_SUFFIX } from "@/lib/synthetic-accounts";
import { TEST_EMAIL_SUFFIX } from "@/lib/synthetic-accounts";

/**
 * Retourne le filtre Prisma excluant les Circles dont le Host est un compte de test.
 * À combiner dans le champ `NOT` d'un `circle.findMany()`.
 *
 * ⚠️ Seul `@test.playground` est masqué, DÉLIBÉRÉMENT : ce seed a une variante
 * production, et ses données n'ont rien à faire dans la découverte publique.
 * Les comptes démo (vitrine assumée) et E2E (base jetable) restent visibles —
 * c'est ce qui permet aux tests de la page Découvrir d'avoir de la matière.
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

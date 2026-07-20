import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";

/**
 * Vrai si `userId` est un organisateur **réellement persisté** (HOST/CO_HOST actif)
 * du Circle. À distinguer de `isActiveOrganizer(membership)` : cette dernière passe
 * aussi pour un admin en host mode, dont la membership est synthétique (proxy
 * `withAdminHostMode`, non persistée en base). `findOrganizers` ne renvoyant que les
 * memberships réelles, l'admin host mode en est exclu — ce qui évite de lui créer une
 * Registration fantôme (create-moment) ou de l'autoriser à s'inscrire (register-organizer).
 *
 * Source unique de la règle « organisateur persisté » : un changement de sémantique
 * (nouveau rôle, etc.) ne se fait qu'ici.
 */
export async function isPersistedOrganizer(
  circleRepository: Pick<CircleRepository, "findOrganizers">,
  circleId: string,
  userId: string
): Promise<boolean> {
  const organizers = await circleRepository.findOrganizers(circleId);
  return organizers.some((organizer) => organizer.userId === userId);
}

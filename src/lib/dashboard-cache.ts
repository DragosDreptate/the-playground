import { cache } from "react";
import { prismaCircleRepository, prismaMomentRepository } from "@/infrastructure/repositories";

/**
 * Versions mises en cache des requêtes dashboard pour les React Server Components.
 * React déduplique automatiquement les appels dans le même arbre de rendu RSC,
 * évitant les connexions TCP concurrentes quand plusieurs composants (CreateMomentButton,
 * CreateCircleButton, DashboardContent) font la même requête pour le même userId.
 */
export const getCachedDashboardCircles = cache((userId: string) =>
  prismaCircleRepository.findAllByUserIdWithStats(userId)
);

export const getCachedHostMoments = cache((userId: string) =>
  prismaMomentRepository.findAllByHostUserId(userId)
);

import { CommunityCardSkeleton } from "@/components/circles/community-card-skeleton";

/**
 * Squelette de l'onglet « Mes Communautés » du dashboard : grille de cartes
 * Communauté verticales (2 colonnes mobile, 3 desktop), comme le rendu réel
 * de `DashboardContent`.
 */
export function DashboardCommunitiesSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <CommunityCardSkeleton key={i} />
      ))}
    </div>
  );
}

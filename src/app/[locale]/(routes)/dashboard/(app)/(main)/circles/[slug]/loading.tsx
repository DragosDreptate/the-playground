import { CircleDetailSkeleton } from "@/components/circles/circle-detail-skeleton";

// La page de gestion d'une Communauté a la même structure que la page publique.
// Sans ce loading.tsx, la navigation afficherait le squelette de l'accueil du
// dashboard (greeting + onglets + timeline), sans rapport avec cette page.
export default function DashboardCircleLoading() {
  return <CircleDetailSkeleton />;
}

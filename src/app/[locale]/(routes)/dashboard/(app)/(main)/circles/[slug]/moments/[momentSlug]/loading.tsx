import { MomentDetailSkeleton } from "@/components/moments/moment-detail-skeleton";

// Sans ce loading dédié, Next.js remonte au squelette de Mon espace (la timeline
// d'événements), qui n'a rien à voir avec la fiche événement. Le conteneur
// (`max-w-5xl px-4`) est fourni par le layout `dashboard/(app)`.
export default function DashboardMomentLoading() {
  return <MomentDetailSkeleton withBreadcrumb />;
}

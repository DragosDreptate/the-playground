import { Skeleton } from "@/components/ui/skeleton";
import { DashboardTimelineSkeleton } from "./_components/dashboard-timeline-skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Greeting */}
      <div className="border-l-[3px] border-primary pl-5">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="mt-2 h-5 w-80 max-w-full" />
      </div>

      {/* Tab selector — groupe pleine largeur en mobile, auto en desktop.
          Le filtre organisateur et le CTA sont conditionnels au rôle (inconnu
          à ce stade) : on modélise le cas neutre onglets seuls. */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-full rounded-full sm:w-52" />
      </div>

      {/* Timeline moments */}
      <DashboardTimelineSkeleton />
    </div>
  );
}

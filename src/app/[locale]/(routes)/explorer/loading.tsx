import { Skeleton } from "@/components/ui/skeleton";
import { CommunityCardSkeleton } from "@/components/circles/community-card-skeleton";

export default function ExplorerLoading() {
  // Pas de section « À la une » : optionnelle et désactivée en production.
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-l-[3px] border-primary pl-5">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-6 w-80 max-w-full" />
      </div>

      {/* Tabs + filters — empilés en mobile, en ligne à partir de sm */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-full rounded-full sm:w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-[180px] rounded-md" />
          <Skeleton className="h-9 w-[150px] rounded-md" />
        </div>
      </div>

      {/* Liste — grille verticale, approxime l'onglet Communautés (défaut) pour limiter le CLS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <CommunityCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

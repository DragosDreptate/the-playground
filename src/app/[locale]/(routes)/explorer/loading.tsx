import { Skeleton } from "@/components/ui/skeleton";

export default function ExplorerLoading() {
  return (
    <div className="space-y-6">
      {/* Titre + barre de filtres */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-32 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      </div>

      {/* Grille 3×2 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card overflow-hidden rounded-2xl border p-4 sm:p-5">
            {/* Mobile: horizontal */}
            <div className="sm:hidden">
              <div className="flex items-start gap-3">
                <Skeleton className="size-[72px] shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            </div>
            {/* Desktop: vertical */}
            <div className="hidden sm:block space-y-3">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Squelette de la timeline « Mes moments », partagé entre le `loading.tsx` de la
 * route et le fallback Suspense de la page. Calque la géométrie réelle de
 * `TimelineScaffold` + `DashboardMomentCard` : gouttière date responsive
 * (55px mobile / 100px desktop, alignée à droite), dot + trait pointillé,
 * carte avec vignette 80px mobile / 100px desktop.
 */
export function DashboardTimelineSkeleton() {
  return (
    <div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-0">
          {/* Colonne date — 2 lignes desktop, 3 lignes mobile (heure) */}
          <div className="w-[55px] shrink-0 pr-1 pt-1 sm:w-[100px] sm:pr-4">
            <div className="flex flex-col items-end gap-1">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-3 w-10 sm:hidden" />
            </div>
          </div>

          {/* Dot + trait pointillé */}
          <div className="flex shrink-0 flex-col items-center">
            <Skeleton className="mt-2 size-2 shrink-0 translate-y-3 rounded-full sm:translate-y-0" />
            {i < 2 && (
              <div className="mt-2 flex-1 border-l border-dashed border-border" />
            )}
          </div>

          {/* Carte — pill Communauté, titre, heure/lieu, avatars, vignette */}
          <div className={`min-w-0 flex-1 pl-1 sm:pl-4 ${i < 2 ? "pb-7" : "pb-0"}`}>
            <div className="bg-card rounded-xl border p-3 shadow-lg dark:shadow-none">
              <Skeleton className="mb-2 h-5 w-2/3 sm:hidden" />
              <div className="flex items-start gap-3 sm:items-center">
                <div className="min-w-0 flex-1 space-y-[7px]">
                  <Skeleton className="h-5 w-32 rounded-full" />
                  <Skeleton className="hidden h-5 w-2/3 sm:block" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-[22px] w-24" />
                </div>
                <Skeleton className="size-[80px] shrink-0 rounded-xl sm:size-[100px]" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

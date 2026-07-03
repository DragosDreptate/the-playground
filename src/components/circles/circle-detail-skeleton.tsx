import { Skeleton } from "@/components/ui/skeleton";

/**
 * Squelette de la page Communauté, partagé par la page publique
 * (`/circles/[slug]`) et la page de gestion (`/dashboard/circles/[slug]`),
 * dont la structure est identique : deux colonnes en desktop (cover +
 * organisateurs/stats/CTA à gauche, contenu à droite) et, en mobile, l'ordre
 * intercalé via `max-lg:contents` + `max-lg:order-N`
 * (breadcrumb → cover → pill/titre/à-propos → organisateurs/stats/CTA → meta/timeline).
 */
export function CircleDetailSkeleton() {
  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <Skeleton className="h-5 w-48" />

      {/* Two-column layout */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* ─── Colonne GAUCHE — cover + organisateurs + stats + CTA ─── */}
        <div className="max-lg:contents lg:sticky lg:top-20 lg:flex lg:w-[340px] lg:shrink-0 lg:flex-col lg:gap-4">
          {/* Cover 1:1 (mobile: order-2) */}
          <div className="max-lg:order-2">
            <Skeleton className="aspect-square w-full rounded-2xl" />
          </div>

          {/* Organisateurs + stats + CTA (mobile: order-4) */}
          <div className="flex flex-col gap-4 max-lg:order-4">
            {/* Organisateurs — liste verticale avatar + nom */}
            <div className="space-y-2 px-1">
              <Skeleton className="h-4 w-24" />
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-7 shrink-0 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <Skeleton className="h-4 w-44" />
            </div>
            <div className="border-border border-t" />

            {/* Stats inline — membres | moments */}
            <div className="flex gap-6 px-1">
              <div className="flex items-baseline gap-2">
                <Skeleton className="h-8 w-10" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex items-baseline gap-2 border-l pl-6">
                <Skeleton className="h-8 w-10" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>

            <div className="border-border border-t max-lg:hidden" />

            {/* CTA (Rejoindre / Se connecter / actions Organisateur) */}
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        </div>

        {/* ─── Colonne DROITE — pill + titre + à-propos + meta + timeline ─── */}
        <div className="max-lg:contents lg:flex lg:min-w-0 lg:flex-1 lg:flex-col lg:gap-5">
          {/* Pill catégorie + titre + à-propos (mobile: order-3) */}
          <div className="flex flex-col gap-5 max-lg:order-3">
            <Skeleton className="h-7 w-32 rounded-full" />
            <Skeleton className="h-9 w-3/4" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <div className="space-y-2 lg:border-primary lg:border-l-2 lg:pl-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          </div>

          {/* Meta + tabs + timeline (mobile: order-5) */}
          <div className="flex flex-col gap-5 max-lg:order-5">
            <div className="border-border border-t" />

            {/* Meta rows */}
            <div className="flex flex-col gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-11 shrink-0 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              ))}
            </div>

            <div className="border-border border-t" />

            {/* Toggle tabs */}
            <Skeleton className="h-9 w-52 rounded-full" />

            {/* Timeline — 3 items */}
            <div>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-0">
                  <div className="w-[55px] shrink-0 pr-1 pt-1 sm:w-[100px] sm:pr-4">
                    <div className="flex flex-col items-end gap-1">
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-center">
                    <Skeleton className="mt-2 size-2 shrink-0 translate-y-3 rounded-full sm:translate-y-0" />
                    {i < 2 && (
                      <div className="mt-2 flex-1 border-l border-dashed border-border" />
                    )}
                  </div>
                  <div className={`min-w-0 flex-1 pl-1 sm:pl-4 ${i < 2 ? "pb-7" : "pb-0"}`}>
                    <div className="bg-card rounded-xl border p-3 shadow-lg dark:shadow-none sm:p-4">
                      <Skeleton className="mb-2 h-5 w-2/3 sm:hidden" />
                      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                        <div className="min-w-0 flex-1 space-y-[7px]">
                          <Skeleton className="hidden h-5 w-2/3 sm:block" />
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-[22px] w-24" />
                        </div>
                        <Skeleton className="size-[80px] shrink-0 rounded-lg sm:size-[100px]" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

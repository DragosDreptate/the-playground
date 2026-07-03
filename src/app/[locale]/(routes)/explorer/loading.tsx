import { Skeleton } from "@/components/ui/skeleton";

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
          <div
            key={i}
            className="bg-card flex flex-col overflow-hidden rounded-2xl border shadow-lg dark:shadow-none"
          >
            <Skeleton className="aspect-square w-full" />

            {/* Body mobile — badge, titre 2 lignes, avatars */}
            <div className="flex flex-col gap-1.5 p-3 sm:hidden">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-[22px] w-24" />
            </div>

            {/* Body desktop — badge, titre, description, ville, avatars, prochain événement */}
            <div className="hidden flex-1 flex-col gap-2 p-4 sm:flex">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-[22px] w-24" />
              <div className="mt-auto pt-2">
                <div className="space-y-1.5 rounded-xl border px-3 py-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

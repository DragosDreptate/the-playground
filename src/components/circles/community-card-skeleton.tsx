import { Skeleton } from "@/components/ui/skeleton";

/**
 * Squelette d'une carte Communauté verticale (`CommunityCard`), utilisé par
 * l'Explorer et l'onglet « Mes Communautés » du dashboard. Reprend les deux
 * markups de la vraie carte : mobile (badge, titre 2 lignes, avatars) et
 * desktop (badge, titre, description, ville, avatars, bloc prochain événement).
 */
export function CommunityCardSkeleton() {
  return (
    <div className="bg-card flex flex-col overflow-hidden rounded-2xl border shadow-lg dark:shadow-none">
      <Skeleton className="aspect-square w-full" />

      {/* Body mobile */}
      <div className="flex flex-col gap-1.5 p-3 sm:hidden">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[22px] w-24" />
      </div>

      {/* Body desktop */}
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
  );
}

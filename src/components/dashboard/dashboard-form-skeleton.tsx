import { Skeleton } from "@/components/ui/skeleton";

/**
 * Squelette générique des pages formulaire du dashboard (création/édition de
 * Communauté ou d'événement) : breadcrumb + formulaire deux colonnes
 * (`CircleForm`/`MomentForm`, `max-w-5xl`) — sélecteur de cover 1:1 à gauche
 * en desktop, champs à droite ; en mobile les champs passent en premier
 * (order-1) et la cover en second, comme les vrais formulaires.
 */
export function DashboardFormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Skeleton className="h-5 w-64 max-w-full" />

      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Sélecteur de cover */}
          <div className="order-2 w-full shrink-0 lg:order-1 lg:w-[340px]">
            <Skeleton className="aspect-square w-full rounded-2xl" />
          </div>

          {/* Champs */}
          <div className="order-1 flex min-w-0 flex-1 flex-col gap-5 lg:order-2">
            {/* Titre heading-style */}
            <Skeleton className="h-10 w-3/4" />

            <div className="border-border border-t" />

            {/* Rangées compactes icône + label + champ */}
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-9 shrink-0 rounded-lg" />
                  <Skeleton className="h-4 w-28 shrink-0" />
                  <Skeleton className="h-9 min-w-0 flex-1 rounded-md" />
                </div>
              ))}
            </div>

            <div className="border-border border-t" />

            {/* Description */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-28 w-full rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

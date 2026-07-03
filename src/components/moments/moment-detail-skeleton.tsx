import { Skeleton } from "@/components/ui/skeleton";

/**
 * Squelette de la page événement, partagé par la page publique (`/m/[slug]`) et la
 * vue Organisateur (`/dashboard/.../moments/[momentSlug]`). Calque la structure de
 * `MomentDetailView` : deux colonnes en desktop (cover + infos Communauté + CTA à
 * gauche, contenu à droite) et, en mobile, le même ordre intercalé via
 * `max-lg:contents` + `max-lg:order-N` que la vraie vue (cover en haut → titre →
 * description → organisateurs/inscription → quand & où → infos Communauté →
 * commentaires). Sans ce
 * miroir, le squelette afficherait la cover en bas et provoquerait un saut de mise
 * en page au moment du rendu.
 */
export function MomentDetailSkeleton({ withBreadcrumb = false }: { withBreadcrumb?: boolean }) {
  return (
    <div className="space-y-8">
      {withBreadcrumb && (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-40" />
        </div>
      )}

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* ─── Colonne GAUCHE — cover + infos Communauté + CTA ─── */}
        <div className="max-lg:contents lg:sticky lg:top-20 lg:flex lg:w-[340px] lg:shrink-0 lg:flex-col lg:gap-4 lg:order-1">
          {/* Cover 1:1 (mobile: order-2) */}
          <div className="max-lg:order-2">
            <Skeleton className="aspect-square w-full rounded-2xl" />
          </div>

          {/* Infos Communauté « Proposé par » (mobile: order-16, vers le bas) */}
          <div className="space-y-2 max-lg:order-16">
            <Skeleton className="h-3 w-40" />
            <div className="flex flex-col gap-2 px-1">
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
          </div>

          {/* Organisateurs + séparateur + bouton d'inscription (mobile: order-7) */}
          <div className="flex flex-col gap-4 max-lg:gap-6 max-lg:order-7">
            <div className="border-border border-t" />
            <div className="space-y-2 px-1">
              <Skeleton className="h-3 w-24" />
              <div className="flex items-center gap-3">
                <Skeleton className="size-7 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-4 w-44" />
            </div>
            <div className="border-border border-t max-lg:hidden" />
            {/* Bouton d'inscription (Button size sm) */}
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        </div>

        {/* ─── Colonne DROITE — titre + description + quand & où ─── */}
        <div className="max-lg:contents lg:flex lg:min-w-0 lg:flex-1 lg:flex-col lg:gap-5 lg:order-2">
          {/* Titre (mobile: order-4) */}
          <div className="space-y-2 max-lg:order-4">
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-9 w-1/2" />
          </div>

          {/* Description (mobile: order-5) */}
          <div className="space-y-2 max-lg:order-5 lg:border-primary lg:border-l-2 lg:pl-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          {/* Quand & Où — date + participants + lieu (mobile: order-9) */}
          <div className="flex flex-col gap-5 max-lg:order-9">
            <div className="border-border border-t" />
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-11 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Skeleton className="size-11 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="size-11 shrink-0 rounded-lg" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          </div>

          {/* Fil de commentaires — toujours rendu (mobile: order-18) */}
          <div className="border-border bg-card rounded-2xl border p-6 max-lg:order-18">
            <div className="space-y-4">
              <Skeleton className="h-3 w-28" />
              <div className="flex gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

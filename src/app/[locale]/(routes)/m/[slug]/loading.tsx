import { Skeleton } from "@/components/ui/skeleton";

export default function MomentLoading() {
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      {/* LEFT column — cover + circle */}
      <div className="order-2 flex w-full flex-col gap-4 lg:order-1 lg:w-[340px] lg:shrink-0">
        {/* Cover 1:1 */}
        <Skeleton className="aspect-square w-full rounded-2xl" />
        {/* Circle link */}
        <div className="flex items-start gap-3 px-1">
          <Skeleton className="mt-0.5 size-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      </div>

      {/* RIGHT column */}
      <div className="order-1 flex min-w-0 flex-1 flex-col gap-5 lg:order-2">
        {/* "Organisé par" */}
        <Skeleton className="h-4 w-48" />

        {/* Titre */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-9 w-1/2" />
        </div>

        <div className="border-border border-t" />

        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        <div className="border-border border-t" />

        {/* Date + lieu */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </div>

        <div className="border-border border-t" />

        {/* Carte inscription */}
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}

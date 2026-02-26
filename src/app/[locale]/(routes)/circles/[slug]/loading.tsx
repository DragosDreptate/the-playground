import { Skeleton } from "@/components/ui/skeleton";

export default function CircleLoading() {
  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <Skeleton className="h-4 w-48" />

      {/* Two-column layout */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* LEFT column — cover + hosts + stats */}
        <div className="order-2 flex w-full flex-col gap-4 lg:order-1 lg:w-[340px] lg:shrink-0">
          {/* Cover 1:1 */}
          <Skeleton className="aspect-square w-full rounded-2xl" />

          {/* Hosts */}
          <div className="space-y-2 px-1">
            <Skeleton className="h-3 w-20" />
            <div className="flex gap-1.5">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="size-8 rounded-full" />
            </div>
            <Skeleton className="h-4 w-32" />
          </div>

          {/* Stats */}
          <div className="flex gap-6 px-1">
            <div className="space-y-1">
              <Skeleton className="h-8 w-10" />
              <Skeleton className="h-3 w-14" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-8 w-10" />
              <Skeleton className="h-3 w-20" />
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
          </div>

          {/* À propos */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>

          <div className="border-border border-t" />

          {/* Meta rows */}
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-9 shrink-0 rounded-lg" />
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

          {/* Timeline skeleton — 3 items */}
          <div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-0">
                <div className="w-[100px] shrink-0 pr-4 pt-1">
                  <Skeleton className="ml-auto h-4 w-16" />
                </div>
                <div className="flex shrink-0 flex-col items-center">
                  <Skeleton className="mt-2 size-2 rounded-full" />
                  {i < 2 && <div className="mt-2 flex-1 border-l border-dashed border-border" style={{ minHeight: "80px" }} />}
                </div>
                <div className={`min-w-0 flex-1 pl-4 ${i < 2 ? "pb-8" : "pb-0"}`}>
                  <Skeleton className="h-[72px] w-full rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

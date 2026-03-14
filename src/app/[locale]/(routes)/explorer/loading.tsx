import { Skeleton } from "@/components/ui/skeleton";

export default function ExplorerLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-80" />
      </div>

      {/* À la une */}
      <div className="rounded-[20px] border p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-44" />
          </div>
          <Skeleton className="hidden sm:block h-3 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-[14px] border p-3">
              <Skeleton className="size-[72px] shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs + filters */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-48 rounded-full" />
        <div className="hidden sm:flex gap-2">
          <Skeleton className="h-9 w-44 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      </div>

      {/* Liste */}
      <div className="flex flex-col gap-2 sm:gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card dark:bg-[oklch(0.22_0.04_281.8)] overflow-hidden rounded-2xl border p-3 sm:p-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Skeleton className="size-[72px] sm:size-[120px] shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="hidden sm:block shrink-0 ml-4">
                <Skeleton className="h-14 w-14 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Greeting skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>

      {/* Tab selector skeleton */}
      <Skeleton className="h-9 w-52 rounded-full" />

      {/* Moment cards skeleton */}
      <div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-0 py-3">
            {/* Date column */}
            <div className="w-[100px] shrink-0 pr-4">
              <Skeleton className="h-4 w-16" />
            </div>
            {/* Dot */}
            <div className="flex shrink-0 flex-col items-center">
              <Skeleton className="size-2.5 rounded-full" />
            </div>
            {/* Card */}
            <div className="min-w-0 flex-1 pl-4 pb-4">
              <Skeleton className="h-[76px] w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function UserProfileLoading() {
  return (
    <div className="mx-auto max-w-lg space-y-8">
      {/* Header */}
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-20 rounded-full" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-28" />
      </div>

      {/* Communautés */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>

      {/* Événements */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-44" />
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

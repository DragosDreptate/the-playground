import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileSetupLoading() {
  return (
    <div className="mx-auto max-w-lg space-y-8 py-4">
      {/* Title */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      {/* Avatar */}
      <div className="flex justify-center">
        <Skeleton className="size-24 rounded-full" />
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileSetupLoading() {
  return (
    <div className="mx-auto max-w-sm space-y-6">
      {/* Avatar puis titre, comme la page */}
      <div className="flex flex-col items-center gap-4 text-center">
        <Skeleton className="size-24 rounded-full" />
        <div className="flex flex-col items-center">
          <Skeleton className="h-8 w-56 max-w-full" />
          <Skeleton className="mt-1 h-4 w-64 max-w-full" />
        </div>
      </div>

      {/* Formulaire setup — grille Prénom/Nom + bouton */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    </div>
  );
}

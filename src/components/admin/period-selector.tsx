import Link from "next/link";
import { cn } from "@/lib/utils";

type PeriodSelectorProps = {
  currentDays: number;
  basePath: string;
};

export function PeriodSelector({ currentDays, basePath }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border p-1">
      {([7, 30, 90] as const).map((days) => (
        <Link
          key={days}
          href={`${basePath}?days=${days}`}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            currentDays === days
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {days}j
        </Link>
      ))}
    </div>
  );
}

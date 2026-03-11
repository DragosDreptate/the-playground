import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

type StatsCardProps = {
  label: string;
  value: number;
  delta?: number;
  deltaLabel?: string;
  icon: LucideIcon;
  href?: string;
};

export function StatsCard({ label, value, delta, deltaLabel, icon: Icon, href }: StatsCardProps) {
  const card = (
    <Card className={href ? "transition-colors hover:border-primary/50" : undefined}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {delta !== undefined && delta > 0 && (
            <p className="text-xs text-primary">
              +{delta} {deltaLabel}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href} className="block">{card}</Link>;
  return card;
}

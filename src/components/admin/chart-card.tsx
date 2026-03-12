import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import type { AdminTimeSeriesPoint } from "@/domain/ports/repositories/admin-repository";
import { SparklineChart } from "./sparkline-chart";

type ChartCardProps = {
  title: string;
  data: AdminTimeSeriesPoint[];
  id: string;
  icon: LucideIcon;
  href: string;
};

export function ChartCard({ title, data, id, icon: Icon, href }: ChartCardProps) {
  const latest = data[data.length - 1]?.count ?? 0;
  const prev = data[data.length - 8]?.count ?? 0; // il y a ~7 jours
  const trend = latest - prev;

  return (
    <Link href={href} className="block group">
      <Card className="transition-colors group-hover:border-primary/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-4" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            </div>
            <ArrowRight className="size-4 text-muted-foreground/40 transition-colors group-hover:text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums">{latest.toLocaleString("fr-FR")}</span>
            {trend !== 0 && (
              <span className={`text-xs font-medium ${trend > 0 ? "text-primary" : "text-destructive"}`}>
                {trend > 0 ? "+" : ""}{trend} vs j-7
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <SparklineChart data={data} id={id} />
        </CardContent>
      </Card>
    </Link>
  );
}

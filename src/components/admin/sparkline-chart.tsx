import type { AdminTimeSeriesPoint } from "@/domain/ports/repositories/admin-repository";

const W = 300;
const H = 72;
const PAD_X = 4;
const PAD_Y = 8;
const PLOT_W = W - PAD_X * 2;
const PLOT_H = H - PAD_Y * 2;

function formatAxisDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

type SparklineChartProps = {
  data: AdminTimeSeriesPoint[];
  id: string; // unique ID pour le gradient SVG
};

export function SparklineChart({ data, id }: SparklineChartProps) {
  if (data.length < 2) return null;

  const max = Math.max(...data.map((d) => d.count), 1);
  const n = data.length;

  const toX = (i: number) => PAD_X + (i / (n - 1)) * PLOT_W;
  const toY = (v: number) => PAD_Y + (1 - v / max) * PLOT_H;

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(d.count).toFixed(1)}`)
    .join(" ");

  const areaPath =
    linePath +
    ` L ${toX(n - 1).toFixed(1)} ${(PAD_Y + PLOT_H).toFixed(1)}` +
    ` L ${toX(0).toFixed(1)} ${(PAD_Y + PLOT_H).toFixed(1)} Z`;

  const gradId = `grad-${id}`;
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full text-primary"
        style={{ height: H }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatAxisDate(data[0].date)}</span>
        <span className="font-medium text-foreground">{total.toLocaleString("fr-FR")} total</span>
        <span>{formatAxisDate(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}

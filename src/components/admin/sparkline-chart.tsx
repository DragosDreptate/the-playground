import type { AdminTimeSeriesPoint } from "@/domain/ports/repositories/admin-repository";

const W = 300;
const PAD_LEFT = 34; // espace pour les labels Y
const PAD_RIGHT = 4;
const PAD_Y = 8;
const PLOT_W = W - PAD_LEFT - PAD_RIGHT;

function formatAxisDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatY(v: number): string {
  if (v >= 10000) return `${Math.round(v / 1000)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
}

type SparklineChartProps = {
  data: AdminTimeSeriesPoint[];
  id: string;
  height?: number;
};

export function SparklineChart({ data, id, height = 72 }: SparklineChartProps) {
  if (data.length < 2) return null;

  const H = height;
  const PLOT_H = H - PAD_Y * 2;

  const max = Math.max(...data.map((d) => d.count), 1);
  const mid = Math.ceil(max / 2);
  const n = data.length;

  const toX = (i: number) => PAD_LEFT + (i / (n - 1)) * PLOT_W;
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

  const yTicks = [
    { value: max, y: toY(max) },
    { value: mid, y: toY(mid) },
    { value: 0, y: toY(0) },
  ];

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

        {/* Lignes de grille horizontales */}
        {yTicks.map(({ value, y }) => (
          <line
            key={value}
            x1={PAD_LEFT}
            y1={y.toFixed(1)}
            x2={W - PAD_RIGHT}
            y2={y.toFixed(1)}
            stroke="white"
            strokeOpacity="0.08"
            strokeWidth="1"
          />
        ))}

        {/* Labels axe Y */}
        {yTicks.map(({ value, y }) => (
          <text
            key={value}
            x={PAD_LEFT - 5}
            y={y.toFixed(1)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize="9"
            fill="white"
            fillOpacity="0.5"
          >
            {formatY(value)}
          </text>
        ))}

        {/* Aire et ligne */}
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
        <span>{formatAxisDate(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}

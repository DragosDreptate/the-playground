import type {
  PosthogDashboard,
  PosthogInsight,
  PosthogSeries,
} from "./fetch-dashboard";

/**
 * Pure HTML builder for the traffic report (daily or weekly).
 * Deterministic, no side effects, trivially testable against fixture JSONs.
 *
 * The builder matches PostHog insights by name *prefix* so it works with
 * both the daily dashboard (insights suffixed "– 24h") and the weekly one
 * (insights suffixed "– 7j"), and with any future variation.
 */

export type ReportPeriod = "day" | "week";

const INSIGHT_PREFIXES = {
  pageviews: "Pageviews & visiteurs uniques",
  sessions: "Sessions",
  interactions: "Interactions clés",
  engagement: "Engagement social",
  pages: "Pages les plus visitées",
} as const;

const INTERACTION_LABELS: Record<string, string> = {
  moment_viewed: "Vues d'événement",
  circle_viewed: "Vues de Communauté",
  moment_created: "Événements créés",
  circle_created: "Communautés créées",
};

const INTERACTION_ORDER = [
  "moment_viewed",
  "circle_viewed",
  "moment_created",
  "circle_created",
];

const ENGAGEMENT_LABELS: Record<string, string> = {
  moment_joined: "Inscriptions à un événement",
  circle_joined_directly: "Inscriptions directes à une Communauté",
  circle_followed: "Abonnements à une Communauté",
  comment_posted: "Commentaires postés",
  radar_searched: "Radar",
};

const ENGAGEMENT_ORDER = [
  "moment_joined",
  "circle_joined_directly",
  "circle_followed",
  "comment_posted",
  "radar_searched",
];

const BREAKDOWN_OTHER_LABEL = "$$_posthog_breakdown_other_$$";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function findInsightByPrefix(
  dashboard: PosthogDashboard,
  prefix: string
): PosthogInsight | null {
  for (const tile of dashboard.tiles) {
    if (tile.insight && tile.insight.name.startsWith(prefix)) return tile.insight;
  }
  return null;
}

function seriesByLabel(insight: PosthogInsight | null): Record<string, number> {
  const out: Record<string, number> = {};
  if (!insight || !insight.result) return out;
  for (const s of insight.result) {
    out[s.label] = Math.round(s.count ?? 0);
  }
  return out;
}

const WEEKDAY_FR = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

function formatDayLabel(iso: string): string {
  // "2026-04-06T00:00:00+02:00" → "lun 06/04"
  if (!iso || iso.length < 10) return "?";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso.slice(0, 10);
  const dayName = WEEKDAY_FR[dt.getDay()] ?? "";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dayName} ${dd}/${mm}`;
}

function peakPoint(
  series: PosthogSeries | undefined,
  period: ReportPeriod
): { label: string; value: number } {
  if (!series || !series.data || !series.days || series.data.length === 0) {
    return { label: "—", value: 0 };
  }
  let maxIdx = 0;
  for (let i = 1; i < series.data.length; i++) {
    if (series.data[i] > series.data[maxIdx]) maxIdx = i;
  }
  const day = series.days[maxIdx] ?? "";
  const label =
    period === "week"
      ? formatDayLabel(day)
      : day.length >= 16
        ? day.slice(11, 16)
        : `${maxIdx}h`;
  return { label, value: Math.round(series.data[maxIdx] ?? 0) };
}

function formatDate(iso: string | undefined): string {
  if (!iso || iso.length < 10) return "?";
  return iso.slice(0, 10);
}

function truncatePath(p: string): string {
  return p.length > 60 ? p.slice(0, 57) + "..." : p;
}

function formatTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function buildReportHtml(
  dashboard: PosthogDashboard,
  generatedAt: Date = new Date(),
  period: ReportPeriod = "day"
): string {
  // ─── Pageviews + unique visitors ───────────────────────────
  const pvInsight = findInsightByPrefix(dashboard, INSIGHT_PREFIXES.pageviews);
  const pvSeries = pvInsight?.result ?? [];
  const pageviews = Math.round(pvSeries[0]?.count ?? 0);
  const uniqueVisitors = Math.round(pvSeries[1]?.count ?? 0);
  const ratio =
    uniqueVisitors > 0
      ? (Math.round((pageviews / uniqueVisitors) * 100) / 100).toFixed(2)
      : "0";

  // ─── Sessions ──────────────────────────────────────────────
  const sessionsInsight = findInsightByPrefix(
    dashboard,
    INSIGHT_PREFIXES.sessions
  );
  const sessionsSeries = sessionsInsight?.result?.[0];
  const sessions = Math.round(sessionsSeries?.count ?? 0);

  // ─── Peaks ─────────────────────────────────────────────────
  const pvPeak = peakPoint(pvSeries[0], period);
  const sessionsPeak = peakPoint(sessionsSeries, period);

  // ─── Interactions ──────────────────────────────────────────
  const interactionsInsight = findInsightByPrefix(
    dashboard,
    INSIGHT_PREFIXES.interactions
  );
  const interactions = seriesByLabel(interactionsInsight);

  // ─── Engagement ────────────────────────────────────────────
  const engagementInsight = findInsightByPrefix(
    dashboard,
    INSIGHT_PREFIXES.engagement
  );
  const engagement = seriesByLabel(engagementInsight);
  const engagementTotal = Object.values(engagement).reduce((a, b) => a + b, 0);

  // ─── Top pages ─────────────────────────────────────────────
  const pagesInsight = findInsightByPrefix(dashboard, INSIGHT_PREFIXES.pages);
  const pages: Array<{ label: string; value: number }> = [];
  let otherPagesValue = 0;
  for (const s of pagesInsight?.result ?? []) {
    const val = Math.round(s.aggregated_value ?? 0);
    if (s.label === BREAKDOWN_OTHER_LABEL) {
      otherPagesValue = val;
      continue;
    }
    pages.push({ label: s.label, value: val });
  }
  pages.sort((a, b) => b.value - a.value);
  const topPages = pages.slice(0, 10);

  // ─── Dates ─────────────────────────────────────────────────
  const days = pvSeries[0]?.days ?? [];
  const dateFrom = formatDate(days[0]);
  const dateTo = formatDate(days[days.length - 1]);
  const now = formatTimestamp(generatedAt);

  // ─── Interactions analysis text ───────────────────────────
  const mv = interactions["moment_viewed"] ?? 0;
  const cv = interactions["circle_viewed"] ?? 0;
  const mc = interactions["moment_created"] ?? 0;
  const cc = interactions["circle_created"] ?? 0;
  const interactionParts: string[] = [];
  if (cv > 0) {
    const r = (Math.round((mv / cv) * 10) / 10).toFixed(1);
    interactionParts.push(
      `<strong>${mv} vues d'événement</strong> contre ${cv} vues de Communauté — ratio événement/Communauté de <strong>${r}×</strong>.`
    );
  } else if (mv > 0) {
    interactionParts.push(
      `<strong>${mv} vues d'événement</strong>, aucune vue de Communauté — trafic concentré sur les pages événement.`
    );
  }
  if (mc === 0 && cc === 0) {
    interactionParts.push(
      "Aucune création d'événement ni de Communauté sur la période — activité de consultation pure."
    );
  } else {
    if (mc > 0) interactionParts.push(`${mc} événement(s) créé(s).`);
    if (cc > 0) interactionParts.push(`${cc} Communauté(s) créée(s).`);
  }
  if (interactionParts.length === 0) {
    interactionParts.push("Activité faible sur la période.");
  }

  // ─── Engagement analysis text ─────────────────────────────
  let engagementAnalysis: string;
  if (engagementTotal === 0) {
    engagementAnalysis =
      "Aucune action d'engagement enregistrée sur la période — trafic de consultation sans conversion.";
  } else {
    const mj = engagement["moment_joined"] ?? 0;
    if (mj > 0 && mv > 0) {
      const rate = (Math.round((mj / mv) * 1000) / 10).toFixed(1);
      engagementAnalysis = `<strong>Taux de conversion événement : ${rate}%</strong> (${mj} inscription(s) sur ${mv} vues)`;
    } else {
      engagementAnalysis = `${engagementTotal} action(s) d'engagement totale(s).`;
    }
  }

  // ─── Period-dependent labels ───────────────────────────────
  const periodLabel = period === "week" ? "7 derniers jours" : "24h";
  const distributionTitle =
    period === "week" ? "Distribution quotidienne" : "Distribution horaire";
  const distributionSubtitle =
    period === "week"
      ? "Pageviews par jour sur la période."
      : "Pageviews par heure sur la période.";
  const barLabelWidth = period === "week" ? "80px" : "50px";
  const peakPreposition = period === "week" ? "le" : "à";

  // ─── HTML assembly ─────────────────────────────────────────
  const parts: string[] = [];

  parts.push(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(dashboard.name)} — The Playground</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f5f7;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="640" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">

<tr><td style="background:linear-gradient(135deg,#ec4899,#a855f7);padding:32px;color:#ffffff;">
<p style="margin:0 0 8px 0;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;opacity:0.9;">The Playground — Reporting</p>
<h1 style="margin:0;font-size:28px;font-weight:700;letter-spacing:-0.5px;">${escapeHtml(dashboard.name)}</h1>
<p style="margin:8px 0 0 0;font-size:14px;opacity:0.9;">${escapeHtml(dashboard.description ?? "")}</p>
<p style="margin:16px 0 0 0;font-size:12px;opacity:0.75;">Période : ${dateFrom} → ${dateTo} · Généré le ${now}</p>
</td></tr>

<tr><td style="padding:32px 32px 0 32px;">
<h2 style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:1px;">Chiffres clés</h2>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
<tr>
<td width="33%" style="padding:16px;background:#faf5ff;border-radius:12px;vertical-align:top;">
<p style="margin:0;font-size:11px;font-weight:600;color:#a855f7;text-transform:uppercase;letter-spacing:1px;">Pageviews</p>
<p style="margin:4px 0 0 0;font-size:32px;font-weight:700;color:#1a1a1a;line-height:1;">${pageviews}</p>
<p style="margin:8px 0 0 0;font-size:12px;color:#6b7280;">Pic ${peakPreposition} ${pvPeak.label} (${pvPeak.value} pv)</p>
</td>
<td width="8"></td>
<td width="33%" style="padding:16px;background:#fdf2f8;border-radius:12px;vertical-align:top;">
<p style="margin:0;font-size:11px;font-weight:600;color:#ec4899;text-transform:uppercase;letter-spacing:1px;">Visiteurs uniques</p>
<p style="margin:4px 0 0 0;font-size:32px;font-weight:700;color:#1a1a1a;line-height:1;">${uniqueVisitors}</p>
<p style="margin:8px 0 0 0;font-size:12px;color:#6b7280;">${ratio} pv / visiteur</p>
</td>
<td width="8"></td>
<td width="33%" style="padding:16px;background:#f5f3ff;border-radius:12px;vertical-align:top;">
<p style="margin:0;font-size:11px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;">Sessions</p>
<p style="margin:4px 0 0 0;font-size:32px;font-weight:700;color:#1a1a1a;line-height:1;">${sessions}</p>
<p style="margin:8px 0 0 0;font-size:12px;color:#6b7280;">Pic ${peakPreposition} ${sessionsPeak.label} (${sessionsPeak.value} sess.)</p>
</td>
</tr>
</table>
</td></tr>

<tr><td style="padding:32px 32px 0 32px;">
<h2 style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:1px;">Interactions clés</h2>
<p style="margin:0 0 16px 0;font-size:13px;color:#6b7280;">Volume des principales interactions sur ${periodLabel} (hors comptes test).</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;border-spacing:0;">
`);

  const maxInteraction = Math.max(1, ...Object.values(interactions));
  for (const key of INTERACTION_ORDER) {
    if (!(key in interactions)) continue;
    const val = interactions[key];
    const label = INTERACTION_LABELS[key] ?? key;
    const barWidth = Math.round((val / maxInteraction) * 100);
    parts.push(`<tr>
<td style="padding:10px 0;font-size:14px;color:#1a1a1a;width:45%;">${escapeHtml(label)}</td>
<td style="padding:10px 0;width:40%;">
  <div style="background:#f3f4f6;border-radius:4px;height:8px;width:100%;">
    <div style="background:linear-gradient(90deg,#ec4899,#a855f7);border-radius:4px;height:8px;width:${barWidth}%;"></div>
  </div>
</td>
<td style="padding:10px 0 10px 12px;font-size:14px;font-weight:700;color:#1a1a1a;text-align:right;">${val}</td>
</tr>
`);
  }

  parts.push(`</table>
<div style="margin-top:16px;padding:12px 16px;background:#fefce8;border-left:3px solid #eab308;border-radius:8px;">
<p style="margin:0;font-size:13px;color:#854d0e;line-height:1.5;">${interactionParts.join(" ")}</p>
</div>
</td></tr>

<tr><td style="padding:32px 32px 0 32px;">
<h2 style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:1px;">Engagement social</h2>
<p style="margin:0 0 16px 0;font-size:13px;color:#6b7280;">Actions d'engagement (rejoindre, suivre, commenter, rechercher) sur ${periodLabel}.</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;border-spacing:0;">
`);

  for (const key of ENGAGEMENT_ORDER) {
    if (!(key in engagement)) continue;
    const val = engagement[key];
    const label = ENGAGEMENT_LABELS[key] ?? key;
    const color = val > 0 ? "#10b981" : "#d1d5db";
    const textColor = val > 0 ? "#1a1a1a" : "#9ca3af";
    parts.push(`<tr>
<td style="padding:10px 0;font-size:14px;color:${textColor};">${escapeHtml(label)}</td>
<td style="padding:10px 0;font-size:14px;font-weight:700;color:${color};text-align:right;">${val}</td>
</tr>
`);
  }

  parts.push(`</table>
<div style="margin-top:16px;padding:12px 16px;background:#fefce8;border-left:3px solid #eab308;border-radius:8px;">
<p style="margin:0;font-size:13px;color:#854d0e;line-height:1.5;">${engagementAnalysis}</p>
</div>
</td></tr>

<tr><td style="padding:32px 32px 0 32px;">
<h2 style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:1px;">Pages les plus visitées</h2>
<p style="margin:0 0 16px 0;font-size:13px;color:#6b7280;">Top 10 des pages par nombre de vues sur ${periodLabel}.</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;border-spacing:0;">
<tr><th style="padding:8px 0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;text-align:left;border-bottom:1px solid #e5e7eb;">#</th><th style="padding:8px 0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;text-align:left;border-bottom:1px solid #e5e7eb;">Page</th><th style="padding:8px 0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;text-align:right;border-bottom:1px solid #e5e7eb;">Vues</th></tr>
`);

  topPages.forEach((page, i) => {
    parts.push(`<tr>
<td style="padding:10px 0;font-size:13px;color:#9ca3af;font-weight:700;width:30px;">${i + 1}</td>
<td style="padding:10px 0;font-size:13px;color:#1a1a1a;font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;word-break:break-all;">${escapeHtml(truncatePath(page.label))}</td>
<td style="padding:10px 0;font-size:13px;font-weight:700;color:#1a1a1a;text-align:right;">${page.value}</td>
</tr>
`);
  });

  if (otherPagesValue > 0) {
    parts.push(`<tr>
<td style="padding:10px 0;font-size:13px;color:#9ca3af;">—</td>
<td style="padding:10px 0;font-size:13px;color:#9ca3af;font-style:italic;">Autres pages (hors top 10)</td>
<td style="padding:10px 0;font-size:13px;font-weight:600;color:#9ca3af;text-align:right;">${otherPagesValue}</td>
</tr>
`);
  }

  parts.push(`</table>
</td></tr>

<tr><td style="padding:32px 32px 0 32px;">
<h2 style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:1px;">${distributionTitle}</h2>
<p style="margin:0 0 16px 0;font-size:13px;color:#6b7280;">${distributionSubtitle}</p>
`);

  const pvData = pvSeries[0]?.data ?? [];
  const pvDays = pvSeries[0]?.days ?? [];
  if (pvData.length > 0) {
    const maxVal = Math.max(1, ...pvData);
    parts.push(`<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;border-spacing:0;">`);
    pvData.forEach((val, i) => {
      const day = pvDays[i] ?? "";
      const barLabel =
        period === "week"
          ? formatDayLabel(day)
          : day.length >= 16
            ? day.slice(11, 16)
            : `${i}h`;
      const bar = Math.round((val / maxVal) * 100);
      const opacity = val > 0 ? "1" : "0.3";
      parts.push(`<tr style="opacity:${opacity};">
<td style="padding:4px 8px 4px 0;font-size:11px;color:#6b7280;font-family:ui-monospace,monospace;width:${barLabelWidth};">${barLabel}</td>
<td style="padding:4px 0;">
  <div style="background:#f3f4f6;border-radius:2px;height:6px;width:100%;">
    <div style="background:linear-gradient(90deg,#ec4899,#a855f7);border-radius:2px;height:6px;width:${bar}%;"></div>
  </div>
</td>
<td style="padding:4px 0 4px 8px;font-size:11px;color:#1a1a1a;font-weight:600;text-align:right;width:30px;">${Math.round(val)}</td>
</tr>`);
    });
    parts.push(`</table>`);
  }

  parts.push(`
</td></tr>

<tr><td style="padding:32px;background:#fafafa;border-top:1px solid #e5e7eb;">
<p style="margin:0 0 8px 0;font-size:12px;color:#6b7280;line-height:1.5;">
Rapport généré automatiquement à partir du dashboard PostHog <a href="https://eu.posthog.com/project/134622/dashboard/${dashboard.id}" style="color:#a855f7;text-decoration:none;">${escapeHtml(dashboard.name)}</a>.
</p>
<p style="margin:0;font-size:11px;color:#9ca3af;">
the playground · ${now}
</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
`);

  return parts.join("");
}

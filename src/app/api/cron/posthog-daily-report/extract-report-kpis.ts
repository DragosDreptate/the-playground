import type { PosthogDashboard } from "./fetch-dashboard";
import { extractNewVisitors } from "./fetch-dashboard";

/**
 * Lightweight KPI extractor used by the Slack notification path.
 * Returns only the numbers that fit in a condensed chat message —
 * the full HTML email is built separately via buildReportHtml.
 */

export interface ReportKpis {
  pageviews: number;
  uniqueVisitors: number;
  sessions: number;
  /** Primo-visiteurs (null si la tile "Primo-visiteurs" est absente). */
  newVisitors: number | null;
  /** Revenants = uniques − primo (null si primo indisponible). */
  returningVisitors: number | null;
}

// Match by name prefix so both the daily ("– 24h") and weekly ("– 7j")
// dashboards resolve through the same helper.
const PAGEVIEWS_INSIGHT_PREFIX = "Pageviews & visiteurs uniques";
const SESSIONS_INSIGHT_PREFIX = "Sessions";

export function extractReportKpis(dashboard: PosthogDashboard): ReportKpis {
  const pvInsight = dashboard.tiles.find((t) =>
    t.insight?.name.startsWith(PAGEVIEWS_INSIGHT_PREFIX)
  )?.insight;
  const pvResult = pvInsight?.result ?? [];
  const pageviews = Math.round(pvResult[0]?.count ?? 0);
  const uniqueVisitors = Math.round(pvResult[1]?.count ?? 0);

  const sessionsInsight = dashboard.tiles.find((t) =>
    t.insight?.name.startsWith(SESSIONS_INSIGHT_PREFIX)
  )?.insight;
  const sessions = Math.round(sessionsInsight?.result?.[0]?.count ?? 0);

  const newVisitors = extractNewVisitors(dashboard);
  const returningVisitors =
    newVisitors == null ? null : Math.max(0, uniqueVisitors - newVisitors);

  return {
    pageviews,
    uniqueVisitors,
    sessions,
    newVisitors,
    returningVisitors,
  };
}

import type { PosthogDashboard } from "./fetch-dashboard";

/**
 * Lightweight KPI extractor used by the Slack notification path.
 * Returns only the numbers that fit in a condensed chat message —
 * the full HTML email is built separately via buildReportHtml.
 */

export interface ReportKpis {
  pageviews: number;
  uniqueVisitors: number;
  sessions: number;
}

const PAGEVIEWS_INSIGHT_NAME = "Pageviews & visiteurs uniques – 24h";
const SESSIONS_INSIGHT_NAME = "Sessions – 24h";

export function extractReportKpis(dashboard: PosthogDashboard): ReportKpis {
  const pvInsight = dashboard.tiles.find(
    (t) => t.insight?.name === PAGEVIEWS_INSIGHT_NAME
  )?.insight;
  const pvResult = pvInsight?.result ?? [];
  const pageviews = Math.round(pvResult[0]?.count ?? 0);
  const uniqueVisitors = Math.round(pvResult[1]?.count ?? 0);

  const sessionsInsight = dashboard.tiles.find(
    (t) => t.insight?.name === SESSIONS_INSIGHT_NAME
  )?.insight;
  const sessions = Math.round(sessionsInsight?.result?.[0]?.count ?? 0);

  return { pageviews, uniqueVisitors, sessions };
}

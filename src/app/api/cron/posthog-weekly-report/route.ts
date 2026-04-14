import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getSender } from "@/infrastructure/services/email/resend-email-service";
import { notifySlackTrafficReport } from "@/infrastructure/services/slack/slack-notification-service";
import {
  fetchPosthogDashboard,
  patchUniqueVisitors,
} from "../posthog-daily-report/fetch-dashboard";
import { buildReportHtml } from "../posthog-daily-report/build-report-html";
import { extractReportKpis } from "../posthog-daily-report/extract-report-kpis";

/**
 * GET /api/cron/posthog-weekly-report
 *
 * Envoie chaque lundi matin un récap HTML du dashboard PostHog "Synthèse
 * trafic hebdomadaire" (trafic sur 7 jours, interactions, engagement,
 * top pages) au destinataire configuré via DAILY_REPORT_RECIPIENT.
 *
 * Même pipeline que la route quotidienne — le builder est period-aware
 * et prend "week" en paramètre pour adapter les libellés (distribution
 * quotidienne, peak "le lun 06/04", fenêtre "7 derniers jours", etc.).
 *
 * Déclenché chaque lundi à 08:07 UTC via Vercel Cron (vercel.json).
 * Vercel Cron invoque les endpoints en GET — on expose aussi POST pour
 * permettre un déclenchement manuel (scripts, curl, tests).
 * Protection : header Authorization: Bearer CRON_SECRET
 */

const DASHBOARD_ID = 615141;
const DASHBOARD_URL = `https://eu.posthog.com/project/134622/dashboard/${DASHBOARD_ID}`;

// Le fetch PostHog avec `?refresh=force_blocking` peut prendre ~7-12s depuis
// la région Vercel `iad1` vers PostHog EU (round-trip US↔EU). Ajouté au reste
// du pipeline (Resend + Slack), on approche les 15s. Défaut serverless à 15s,
// on élargit à 60s pour être large. Le weekly a plus de data (7j vs 24h) donc
// un refresh légèrement plus long que le daily.
export const maxDuration = 60;

async function handler(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    Sentry.captureMessage(
      "[cron] posthog-weekly-report: unauthorized request",
      "warning"
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipient = process.env.DAILY_REPORT_RECIPIENT;
  if (!recipient) {
    console.error(
      "[posthog-weekly-report] DAILY_REPORT_RECIPIENT is not configured"
    );
    Sentry.captureMessage(
      "[cron] posthog-weekly-report: DAILY_REPORT_RECIPIENT is not configured",
      "error"
    );
    return NextResponse.json(
      { error: "Recipient not configured" },
      { status: 500 }
    );
  }

  const startedAt = Date.now();

  try {
    const dashboard = await fetchPosthogDashboard(DASHBOARD_ID);
    patchUniqueVisitors(dashboard);
    const html = buildReportHtml(dashboard, new Date(), "week");

    const resend = new Resend(process.env.AUTH_RESEND_KEY);
    await resend.emails.send({
      from: getSender(),
      to: [recipient],
      subject: `${dashboard.name} — The Playground`,
      html,
    });

    // Slack mirror — best-effort, silent failure (same pattern as other admin notifs).
    const kpis = extractReportKpis(dashboard);
    await notifySlackTrafficReport({
      dashboardName: dashboard.name,
      pageviews: kpis.pageviews,
      uniqueVisitors: kpis.uniqueVisitors,
      sessions: kpis.sessions,
      dashboardUrl: DASHBOARD_URL,
    });

    const durationMs = Date.now() - startedAt;
    console.log(
      `[posthog-weekly-report] Report sent to ${recipient} in ${durationMs}ms`
    );

    return NextResponse.json({
      success: true,
      dashboardId: DASHBOARD_ID,
      recipient,
      durationMs,
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error(
      `[posthog-weekly-report] Erreur après ${durationMs}ms :`,
      error
    );
    Sentry.captureException(error, {
      tags: { cron: "posthog-weekly-report" },
      extra: { durationMs, dashboardId: DASHBOARD_ID },
    });
    return NextResponse.json(
      { error: "Report generation failed" },
      { status: 500 }
    );
  }
}

export { handler as GET, handler as POST };

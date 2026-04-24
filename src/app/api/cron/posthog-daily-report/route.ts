import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createSafeResend } from "@/lib/email/safe-resend";
import { getSender } from "@/infrastructure/services/email/resend-email-service";
import { notifySlackTrafficReport } from "@/infrastructure/services/slack/slack-notification-service";
import { fetchPosthogDashboard, patchUniqueVisitors } from "./fetch-dashboard";
import { buildReportHtml } from "./build-report-html";
import { extractReportKpis } from "./extract-report-kpis";

/**
 * GET /api/cron/posthog-daily-report
 *
 * Envoie chaque matin un récap HTML du dashboard PostHog "Synthèse trafic
 * quotidienne" (trafic 24h, interactions, engagement, top pages) au
 * destinataire configuré via DAILY_REPORT_RECIPIENT.
 *
 * Déclenché quotidiennement à 08:07 UTC via Vercel Cron (vercel.json).
 * Vercel Cron invoque les endpoints en GET — on expose aussi POST pour
 * permettre un déclenchement manuel (scripts, curl, tests).
 * Protection : header Authorization: Bearer CRON_SECRET
 */

const DASHBOARD_ID = 601861;
const DASHBOARD_URL = `https://eu.posthog.com/project/134622/dashboard/${DASHBOARD_ID}`;

// Le fetch PostHog avec `?refresh=force_blocking` peut prendre ~7-12s depuis
// la région Vercel `iad1` vers PostHog EU (round-trip US↔EU). Ajouté au reste
// du pipeline (Resend + Slack), on approche les 15s. Défaut serverless à 15s,
// on élargit à 60s pour être large.
export const maxDuration = 60;

async function handler(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    Sentry.captureMessage(
      "[cron] posthog-daily-report: unauthorized request",
      "warning"
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipient = process.env.DAILY_REPORT_RECIPIENT;
  if (!recipient) {
    console.error("[posthog-daily-report] DAILY_REPORT_RECIPIENT is not configured");
    Sentry.captureMessage(
      "[cron] posthog-daily-report: DAILY_REPORT_RECIPIENT is not configured",
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
    const html = buildReportHtml(dashboard);

    const resend = createSafeResend(process.env.AUTH_RESEND_KEY);
    await resend.emails.send({
      from: getSender(),
      to: [recipient],
      subject: `${dashboard.name} — The Playground`,
      html,
    });

    // Slack mirror — best-effort, silent failure (same pattern as other admin notifs).
    // Email is the primary channel and has already been sent at this point.
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
      `[posthog-daily-report] Report sent to ${recipient} in ${durationMs}ms`
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
      `[posthog-daily-report] Erreur après ${durationMs}ms :`,
      error
    );
    Sentry.captureException(error, {
      tags: { cron: "posthog-daily-report" },
      extra: { durationMs, dashboardId: DASHBOARD_ID },
    });
    return NextResponse.json(
      { error: "Report generation failed" },
      { status: 500 }
    );
  }
}

export { handler as GET, handler as POST };

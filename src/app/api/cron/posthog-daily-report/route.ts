import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getSender } from "@/infrastructure/services/email/resend-email-service";
import { fetchPosthogDashboard } from "./fetch-dashboard";
import { buildReportHtml } from "./build-report-html";

/**
 * POST /api/cron/posthog-daily-report
 *
 * Envoie chaque matin un récap HTML du dashboard PostHog "Synthèse trafic
 * quotidienne" (trafic 24h, interactions, engagement, top pages) au
 * destinataire configuré via DAILY_REPORT_RECIPIENT.
 *
 * Déclenché quotidiennement à 08:07 UTC via Vercel Cron (vercel.json).
 * Protection : header Authorization: Bearer CRON_SECRET
 */

const DASHBOARD_ID = 601861;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipient = process.env.DAILY_REPORT_RECIPIENT;
  if (!recipient) {
    console.error("[posthog-daily-report] DAILY_REPORT_RECIPIENT is not configured");
    return NextResponse.json(
      { error: "Recipient not configured" },
      { status: 500 }
    );
  }

  const startedAt = Date.now();

  try {
    const dashboard = await fetchPosthogDashboard(DASHBOARD_ID);
    const html = buildReportHtml(dashboard);

    const resend = new Resend(process.env.AUTH_RESEND_KEY);
    await resend.emails.send({
      from: getSender(),
      to: [recipient],
      subject: `${dashboard.name} — The Playground`,
      html,
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
    return NextResponse.json(
      { error: "Report generation failed" },
      { status: 500 }
    );
  }
}

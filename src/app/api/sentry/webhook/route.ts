import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import * as Sentry from "@sentry/nextjs";
import { analyzeSentryIssue } from "@/infrastructure/services/sentry/analyze-issue";

function verifySignature(body: string, signature: string, secret: string): boolean {
  const hmac = createHmac("sha256", secret);
  hmac.update(body, "utf8");
  const digest = hmac.digest("hex");
  return digest === signature;
}

type SentryIssueWebhook = {
  action: "created" | "resolved" | "assigned" | "archived" | "unresolved";
  data: {
    issue: {
      id: string;
      shortId: string;
      title: string;
      culprit: string;
      level: string;
      status: string;
      platform: string;
      project: { id: string; name: string; slug: string };
      count: string;
      userCount: number;
      firstSeen: string;
      lastSeen: string;
      metadata: {
        type?: string;
        value?: string;
        filename?: string;
        function?: string;
      };
    };
  };
};

export async function POST(request: NextRequest) {
  const secret = process.env.SENTRY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("sentry-hook-signature");
  const resource = request.headers.get("sentry-hook-resource");

  if (!signature || !verifySignature(body, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Only process new issues
  if (resource !== "issue") {
    return NextResponse.json({ received: true, skipped: "not an issue event" });
  }

  const payload = JSON.parse(body) as SentryIssueWebhook;

  if (payload.action !== "created") {
    return NextResponse.json({ received: true, skipped: `action: ${payload.action}` });
  }

  // Respond 200 immediately, analyze in background (Sentry requires < 1s response)
  const issueId = payload.data.issue.id;
  const issueTitle = payload.data.issue.title;
  const issueShortId = payload.data.issue.shortId;

  analyzeSentryIssue({
    issueId,
    issueShortId,
    issueTitle,
    culprit: payload.data.issue.culprit,
    level: payload.data.issue.level,
    platform: payload.data.issue.platform,
    projectSlug: payload.data.issue.project.slug,
    metadata: payload.data.issue.metadata,
  }).catch((err) => Sentry.captureException(err));

  return NextResponse.json({ received: true, issueId: issueShortId });
}

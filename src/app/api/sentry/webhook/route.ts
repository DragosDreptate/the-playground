import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import * as Sentry from "@sentry/nextjs";
import { analyzeSentryIssue } from "@/infrastructure/services/sentry/analyze-issue";

function verifySignature(body: string, signature: string, secret: string): boolean {
  const hmac = createHmac("sha256", secret);
  hmac.update(body, "utf8");
  const digest = hmac.digest("hex");
  if (digest.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
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

  if (resource !== "issue") {
    return NextResponse.json({ received: true, skipped: "not an issue event" });
  }

  let payload: SentryIssueWebhook;
  try {
    payload = JSON.parse(body) as SentryIssueWebhook;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.action !== "created") {
    return NextResponse.json({ received: true, skipped: `action: ${payload.action}` });
  }

  const issue = payload.data?.issue;
  if (!issue?.id || !issue?.shortId || !issue?.title) {
    return NextResponse.json({ error: "Missing issue data" }, { status: 400 });
  }

  // after() keeps the serverless function alive on Vercel after the response is sent
  after(async () => {
    try {
      await analyzeSentryIssue({
        issueId: issue.id,
        issueShortId: issue.shortId,
        issueTitle: issue.title,
        culprit: issue.culprit,
        level: issue.level,
        platform: issue.platform,
        projectSlug: issue.project?.slug ?? "",
        metadata: issue.metadata ?? {},
      });
    } catch (err) {
      Sentry.captureException(err);
    }
  });

  return NextResponse.json({ received: true, issueId: issue.shortId });
}

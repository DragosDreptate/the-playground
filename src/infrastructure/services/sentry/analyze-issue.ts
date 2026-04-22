import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { getSender } from "@/infrastructure/services/email/resend-email-service";
import { notifySlackSentryIssue, isAdminEmailEnabled } from "@/infrastructure/services/slack/slack-notification-service";
import { SentryIssueAnalysisEmail } from "./sentry-issue-analysis-email";
import { URGENCY_META, type AnalysisResult, type UserImpact, type UserImpactLevel } from "./analysis-meta";
import { buildAnalysisPrompt } from "./build-prompt";

export type { UserImpact, UserImpactLevel } from "./analysis-meta";

const SENTRY_REGION = "https://de.sentry.io";
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

export type IssueInput = {
  issueId: string;
  issueShortId: string;
  issueTitle: string;
  culprit: string;
  level: string;
  platform: string;
  projectSlug: string;
  metadata: {
    type?: string;
    value?: string;
    filename?: string;
    function?: string;
  };
};

type SentryEventFrame = {
  filename?: string;
  lineNo?: number;
  colNo?: number;
  function?: string;
  inApp?: boolean;
  context?: [number, string][];
};

type SentryEvent = {
  eventID: string;
  title: string;
  tags: { key: string; value: string }[];
  request?: { url?: string; method?: string };
  entries: {
    type: string;
    data: {
      values?: {
        type: string;
        value: string;
        mechanism?: { type: string; handled: boolean };
        stacktrace?: { frames: SentryEventFrame[] };
      }[];
    };
  }[];
};

async function fetchLatestEvent(issueId: string, token: string): Promise<SentryEvent | null> {
  try {
    const res = await fetch(
      `${SENTRY_REGION}/api/0/issues/${issueId}/events/latest/`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return null;
    return (await res.json()) as SentryEvent;
  } catch {
    return null;
  }
}

type EventContext = {
  stacktrace: string;
  tags: Record<string, string>;
  requestUrl?: string;
  requestMethod?: string;
};

function extractEventContext(event: SentryEvent): EventContext {
  const lines: string[] = [];

  for (const entry of event.entries) {
    if (entry.type !== "exception") continue;
    for (const val of entry.data.values ?? []) {
      lines.push(`${val.type}: ${val.value}`);
      lines.push(`Handled: ${val.mechanism?.handled ?? "unknown"}`);
      const frames = val.stacktrace?.frames ?? [];
      const appFrames = frames.filter((f) => f.inApp);
      const relevantFrames = appFrames.length > 0 ? appFrames.slice(-8) : frames.slice(-5);
      for (const frame of relevantFrames) {
        lines.push(`  ${frame.filename}:${frame.lineNo} in ${frame.function ?? "(anonymous)"}`);
      }
    }
  }

  const tags: Record<string, string> = {};
  for (const t of event.tags ?? []) {
    tags[t.key] = t.value;
  }

  return {
    stacktrace: lines.join("\n"),
    tags,
    requestUrl: event.request?.url,
    requestMethod: event.request?.method,
  };
}

const FALLBACK_USER_IMPACT: UserImpact = {
  level: "silent",
  description: "Impact utilisateur non évalué, à vérifier manuellement dans Sentry",
};

function fallbackResult(issue: IssueInput, rawText?: string): AnalysisResult {
  return {
    urgency: "medium",
    trigger: "Déclencheur non identifié — vérifier les tags Sentry (cron, url, action)",
    functionalConsequence: "Conséquence fonctionnelle non identifiée — inspecter le handler concerné",
    userImpact: FALLBACK_USER_IMPACT,
    technical: rawText?.slice(0, 300) ?? `${issue.issueTitle} — analyse technique indisponible, ouvrir l'issue dans Sentry`,
  };
}

function isValidUserImpact(value: unknown): value is UserImpact {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const validLevels: UserImpactLevel[] = ["none", "silent", "degraded", "blocking"];
  return (
    typeof v.level === "string" &&
    validLevels.includes(v.level as UserImpactLevel) &&
    typeof v.description === "string" &&
    v.description.length > 0
  );
}

function isValidAnalysisResult(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<AnalysisResult>;
  const validUrgencies: AnalysisResult["urgency"][] = ["critical", "high", "medium", "low", "noise"];
  return (
    typeof v.urgency === "string" && validUrgencies.includes(v.urgency as AnalysisResult["urgency"]) &&
    typeof v.trigger === "string" && v.trigger.length > 0 &&
    typeof v.functionalConsequence === "string" && v.functionalConsequence.length > 0 &&
    typeof v.technical === "string" && v.technical.length > 0 &&
    isValidUserImpact(v.userImpact)
  );
}

async function analyzeWithClaude(
  issue: IssueInput,
  context: EventContext
): Promise<AnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ...fallbackResult(issue),
      userImpact: { level: "silent", description: "Impossible d'analyser (ANTHROPIC_API_KEY manquante)" },
    };
  }

  const client = new Anthropic({ apiKey });
  const prompt = buildAnalysisPrompt(issue, context);

  const resp = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 900,
    messages: [{ role: "user", content: prompt }],
  });

  const tb = resp.content.find((b): b is Anthropic.Messages.TextBlock => b.type === "text");
  if (!tb) return fallbackResult(issue);

  try {
    const raw = tb.text.trim();
    const openBrace = raw.indexOf("{");
    const closeBrace = raw.lastIndexOf("}");
    const jsonStr = openBrace >= 0 && closeBrace > openBrace ? raw.slice(openBrace, closeBrace + 1) : raw;
    const parsed = JSON.parse(jsonStr);
    return isValidAnalysisResult(parsed) ? parsed : fallbackResult(issue, tb.text);
  } catch {
    return fallbackResult(issue, tb.text);
  }
}

async function sendAnalysisEmail(
  issue: IssueInput,
  analysis: AnalysisResult,
  sentryUrl: string
): Promise<void> {
  const resendKey = process.env.AUTH_RESEND_KEY;
  if (!resendKey) return;

  const resend = new Resend(resendKey);
  const adminEmail = process.env.SENTRY_ALERT_EMAIL ?? "ddreptate@gmail.com";
  const urgencyLabel = URGENCY_META[analysis.urgency].label;

  await resend.emails.send({
    from: getSender(),
    to: adminEmail,
    subject: `[Sentry ${urgencyLabel}] ${issue.issueShortId} — ${issue.issueTitle.slice(0, 80)}`,
    react: SentryIssueAnalysisEmail({ issue, analysis, sentryUrl }),
  });
}

export async function analyzeSentryIssue(issue: IssueInput): Promise<void> {
  const token = process.env.SENTRY_AUTH_TOKEN;
  if (!token) return;

  const sentryOrg = process.env.SENTRY_ORG ?? "the-playground-id";

  const event = await fetchLatestEvent(issue.issueId, token);
  const context: EventContext = event
    ? extractEventContext(event)
    : { stacktrace: "", tags: {} };

  const analysis = await analyzeWithClaude(issue, context);
  const sentryUrl = `https://${sentryOrg}.sentry.io/issues/${issue.issueId}/`;

  await Promise.all([
    isAdminEmailEnabled() ? sendAnalysisEmail(issue, analysis, sentryUrl) : Promise.resolve(),
    notifySlackSentryIssue({ issue, analysis, sentryUrl }),
  ]);
}

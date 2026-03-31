import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { getSender } from "@/infrastructure/services/email/resend-email-service";
import { SentryIssueAnalysisEmail } from "./sentry-issue-analysis-email";

const SENTRY_REGION = "https://de.sentry.io";
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

type IssueInput = {
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

function extractStacktraceSummary(event: SentryEvent): string {
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

  const url = event.tags.find((t) => t.key === "url")?.value;
  const browser = event.tags.find((t) => t.key === "browser")?.value;
  const os = event.tags.find((t) => t.key === "os")?.value;
  if (url) lines.push(`URL: ${url}`);
  if (browser) lines.push(`Browser: ${browser}`);
  if (os) lines.push(`OS: ${os}`);

  return lines.join("\n");
}

type AnalysisResult = {
  urgency: "critical" | "high" | "medium" | "low" | "noise";
  impact: string;
  diagnosis: string;
  remediation: string;
};

async function analyzeWithClaude(
  issue: IssueInput,
  stacktrace: string
): Promise<AnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      urgency: "medium",
      impact: "Impossible d'analyser (ANTHROPIC_API_KEY manquante)",
      diagnosis: issue.issueTitle,
      remediation: "Vérifier manuellement dans Sentry",
    };
  }

  const client = new Anthropic({ apiKey });

  const prompt = `Analyse cette erreur Sentry d'une application Next.js (The Playground - plateforme de communautés/événements).

Issue: ${issue.issueShortId}
Titre: ${issue.issueTitle}
Culprit: ${issue.culprit}
Level: ${issue.level}
Platform: ${issue.platform}
Metadata: type=${issue.metadata.type}, filename=${issue.metadata.filename}, function=${issue.metadata.function}

Stacktrace et contexte:
${stacktrace || "(aucune stacktrace disponible)"}

Réponds UNIQUEMENT avec un JSON valide:
{
  "urgency": "critical|high|medium|low|noise",
  "impact": "description courte de l'impact utilisateur (1 phrase)",
  "diagnosis": "explication technique de la cause (2-3 phrases max)",
  "remediation": "plan de correction concret (fichier à modifier, approche, 2-3 phrases max)"
}

Règles:
- "noise" = erreur d'extension navigateur, bot, ou erreur non-actionnable
- "critical" = perte de données, paiement échoué, auth cassée
- "high" = fonctionnalité principale cassée pour les utilisateurs
- "medium" = bug visible mais contournable
- "low" = cosmétique, edge case rare`;

  const resp = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const tb = resp.content.find((b): b is Anthropic.Messages.TextBlock => b.type === "text");
  if (!tb) {
    return { urgency: "medium", impact: "Analyse indisponible", diagnosis: issue.issueTitle, remediation: "Vérifier manuellement" };
  }

  try {
    const raw = tb.text.trim();
    const jsonStr = raw.startsWith("{") ? raw : raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonStr) as AnalysisResult;
    if (!parsed.urgency || !parsed.impact || !parsed.diagnosis || !parsed.remediation) {
      return { urgency: "medium", impact: "Analyse incomplète", diagnosis: tb.text.slice(0, 200), remediation: "Vérifier manuellement" };
    }
    return parsed;
  } catch {
    return { urgency: "medium", impact: "Analyse malformée", diagnosis: tb.text.slice(0, 200), remediation: "Vérifier manuellement" };
  }
}

const URGENCY_LABELS: Record<string, string> = {
  critical: "CRITIQUE",
  high: "HAUTE",
  medium: "MOYENNE",
  low: "BASSE",
  noise: "BRUIT",
};

async function sendAnalysisEmail(
  issue: IssueInput,
  analysis: AnalysisResult,
  sentryUrl: string
): Promise<void> {
  const resendKey = process.env.AUTH_RESEND_KEY;
  if (!resendKey) return;

  const resend = new Resend(resendKey);
  const adminEmail = process.env.SENTRY_ALERT_EMAIL ?? "dragos@theplayground.fr";
  const urgencyLabel = URGENCY_LABELS[analysis.urgency] ?? "INCONNUE";

  await resend.emails.send({
    from: getSender(),
    to: adminEmail,
    subject: `[Sentry ${urgencyLabel}] ${issue.issueShortId} — ${issue.issueTitle.slice(0, 80)}`,
    react: SentryIssueAnalysisEmail({
      issueShortId: issue.issueShortId,
      issueTitle: issue.issueTitle,
      culprit: issue.culprit,
      urgency: analysis.urgency,
      urgencyLabel,
      impact: analysis.impact,
      diagnosis: analysis.diagnosis,
      remediation: analysis.remediation,
      sentryUrl,
    }),
  });
}

export async function analyzeSentryIssue(issue: IssueInput): Promise<void> {
  const token = process.env.SENTRY_AUTH_TOKEN;
  const resendKey = process.env.AUTH_RESEND_KEY;
  if (!token || !resendKey) return;

  const sentryOrg = process.env.SENTRY_ORG ?? "the-playground-id";

  // 1. Fetch latest event with stacktrace
  const event = await fetchLatestEvent(issue.issueId, token);
  const stacktrace = event ? extractStacktraceSummary(event) : "";

  // 2. Analyze with Claude
  const analysis = await analyzeWithClaude(issue, stacktrace);

  // 3. Send email
  const sentryUrl = `https://${sentryOrg}.sentry.io/issues/${issue.issueId}/`;
  await sendAnalysisEmail(issue, analysis, sentryUrl);
}

import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { getSender } from "@/infrastructure/services/email/resend-email-service";
import { notifySlackSentryIssue, isAdminEmailEnabled } from "@/infrastructure/services/slack/slack-notification-service";
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

export type UserImpactLevel = "none" | "silent" | "degraded" | "blocking";

export type UserImpact = {
  level: UserImpactLevel;
  description: string;
};

type AnalysisResult = {
  urgency: "critical" | "high" | "medium" | "low" | "noise";
  trigger: string;
  functionalConsequence: string;
  userImpact: UserImpact;
  technical: string;
};

const FALLBACK_USER_IMPACT: UserImpact = {
  level: "silent",
  description: "Impact utilisateur non évalué, à vérifier manuellement dans Sentry",
};

const FALLBACK_TRIGGER = "Déclencheur non identifié — vérifier les tags Sentry (cron, url, action)";
const FALLBACK_CONSEQUENCE = "Conséquence fonctionnelle non identifiée — inspecter le handler concerné";
const FALLBACK_TECHNICAL = "Analyse technique indisponible — ouvrir l'issue dans Sentry";

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

function formatTagsForPrompt(tags: Record<string, string>): string {
  const keysOfInterest = [
    "cron",
    "environment",
    "release",
    "url",
    "transaction",
    "route",
    "server_action",
    "runtime",
    "handled",
    "mechanism",
  ];
  const pairs = keysOfInterest
    .filter((k) => tags[k])
    .map((k) => `${k}=${tags[k]}`);
  if (pairs.length === 0) return "(aucun tag utile)";
  return pairs.join(", ");
}

async function analyzeWithClaude(
  issue: IssueInput,
  context: EventContext
): Promise<AnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      urgency: "medium",
      trigger: FALLBACK_TRIGGER,
      functionalConsequence: FALLBACK_CONSEQUENCE,
      userImpact: { level: "silent", description: "Impossible d'analyser (ANTHROPIC_API_KEY manquante)" },
      technical: issue.issueTitle,
    };
  }

  const client = new Anthropic({ apiKey });

  const tagsLine = formatTagsForPrompt(context.tags);
  const requestLine = context.requestUrl
    ? `${context.requestMethod ?? "?"} ${context.requestUrl}`
    : "(aucune request HTTP — probablement un job background, cron ou server action)";

  const prompt = `Analyse cette erreur Sentry d'une application Next.js (The Playground - plateforme de communautés/événements).

Tu produis une analyse LISIBLE PAR UN NON-TECHNICIEN. Ton objectif : expliquer QUI a déclenché l'erreur, QUOI est cassé côté produit, et COMMENT l'utilisateur le ressent. Les détails techniques viennent en dernier, condensés.

## Contexte de l'erreur

Issue: ${issue.issueShortId}
Titre: ${issue.issueTitle}
Culprit: ${issue.culprit}
Level: ${issue.level}
Platform: ${issue.platform}
Metadata: type=${issue.metadata.type}, filename=${issue.metadata.filename}, function=${issue.metadata.function}
Tags pertinents: ${tagsLine}
Request: ${requestLine}

Stacktrace et contexte:
${context.stacktrace || "(aucune stacktrace disponible)"}

## Réponds UNIQUEMENT avec un JSON valide

{
  "urgency": "critical|high|medium|low|noise",
  "trigger": "Phrase courte (1-2) qui répond à : qu'est-ce qui a provoqué cette erreur ? Précise le contexte d'activité (page, action utilisateur, cron, webhook, job). Langage métier, pas technique.",
  "functionalConsequence": "Phrase courte (1-2) qui répond à : qu'est-ce qui est cassé côté produit ? En termes métier (inscription, paiement, création d'événement, rappel, check-in, commentaire, affichage). PAS de jargon DB/framework.",
  "userImpact": {
    "level": "none|silent|degraded|blocking",
    "description": "Phrase courte (1-2) qui commence par le rôle concerné (un participant, un organisateur, un visiteur anonyme, aucun utilisateur). Décrit CE QUE RESSENT l'utilisateur : écran d'erreur, email pas reçu, bouton qui ne répond pas, etc. PAS de jargon."
  },
  "technical": "Bloc condensé (3 phrases max) réservé aux devs : cause probable + fichier/fonction à investiguer + piste de correction. Peut contenir du jargon."
}

## Heuristiques pour le TRIGGER

Ordre de priorité :
1. Si tag \`cron\` présent → "Le cron automatique <nom> (<fréquence si connue>). Aucune action utilisateur."
2. Si request URL présente :
   - \`/api/cron/*\` → cron
   - \`/api/webhook/*\` ou \`/api/*/webhook\` → "Un webhook <service> reçu par la plateforme"
   - \`/api/*\` → "Un appel API depuis le frontend"
   - \`/m/[slug]\` → "Un visiteur/participant consulte une page événement"
   - \`/c/[slug]\` → "Un visiteur consulte une page Communauté"
   - \`/dashboard/*\` → "Un organisateur utilise son dashboard"
   - \`/explorer\` → "Un visiteur parcourt la page Découvrir"
   - Autre → cite le chemin
3. Si la stack contient une server action nommée (\`createMoment\`, \`registerToMoment\`, etc.) → "Un utilisateur a lancé l'action <nom> (<ce que ça fait en clair>)"
4. Sinon, regarder les noms de fichiers inApp pour déduire le contexte (email/, stripe/, auth/...)

Ne JAMAIS dire "Une erreur s'est produite". Sois spécifique.

## Heuristiques pour la FUNCTIONAL CONSEQUENCE

Traduire la partie technique en impact produit concret :
- Query DB qui timeout pendant envoi rappels → "Les rappels email n'ont pas pu être envoyés pour ce run"
- Erreur Stripe webhook → "Un paiement n'a pas été confirmé côté plateforme"
- Erreur dans server action \`registerToMoment\` → "Une inscription à un événement n'a pas pu aboutir"
- Erreur OG image generation → "L'aperçu social (OG image) d'un événement n'est pas généré"
- Erreur auth magic link → "L'envoi du magic link de connexion a échoué"

Ne PAS dire "la query findMany a échoué" — dire ce que ça représente produit.

## Heuristiques pour USER IMPACT

Niveau (\`level\`) :
- "none" = l'utilisateur ne perçoit absolument rien (script tiers, handler pagehide/unload, erreur silencieuse, bot, cron sans conséquence visible immédiate)
- "silent" = erreur visible uniquement en devtools, aucune gêne fonctionnelle
- "degraded" = expérience dégradée mais utilisable (feature secondaire cassée, notification manquante, fallback, latence)
- "blocking" = l'utilisateur est bloqué et ne peut pas accomplir son action

Checklist :
1. Script tiers (PostHog, GA, Stripe.js, extension) ? → level ≤ silent
2. Pendant pagehide/unload/visibilitychange/beforeunload ? → level = none
3. Handled (try/catch, mechanism.handled=true) ? → level ≤ silent dans la plupart des cas, SAUF si l'utilisateur voit une page 500 ou un message d'erreur
4. Crash visuel prouvé par la stack ou le contexte ? → degraded ou blocking

Description (\`userImpact.description\`) :
- Commence par le rôle : "Un participant...", "Un organisateur...", "Un visiteur anonyme...", "Aucun utilisateur..."
- Décrit CE QU'IL VOIT OU NE VOIT PAS : "verra un écran 500", "ne recevra pas son email de rappel", "ne pourra pas cliquer sur Publier", "reste sur la page blanche quelques secondes puis réessaye"
- Dans le doute, préfère "none"/"silent" et dis-le franchement ("aucun utilisateur affecté directement pour ce run")

## Heuristiques pour URGENCY

- "critical" = perte de données, paiement cassé, auth cassée
- "high" = fonctionnalité principale cassée pour de vrais utilisateurs
- "medium" = bug visible mais contournable
- "low" = cosmétique, edge case rare
- "noise" = extension navigateur, bot, erreur non-actionnable

## Règle d'or

Si tu hésites à mettre du jargon, demande-toi : est-ce qu'un organisateur non-tech comprendrait ? Si non → reformule. Les seules sections où le jargon est permis sont \`technical\` et le culprit implicite.`;

  const resp = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 900,
    messages: [{ role: "user", content: prompt }],
  });

  const tb = resp.content.find((b): b is Anthropic.Messages.TextBlock => b.type === "text");
  if (!tb) {
    return fallbackResult(issue);
  }

  try {
    const raw = tb.text.trim();
    const jsonStr = raw.startsWith("{") ? raw : raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonStr) as Partial<AnalysisResult>;
    if (
      !parsed.urgency ||
      typeof parsed.trigger !== "string" || parsed.trigger.length === 0 ||
      typeof parsed.functionalConsequence !== "string" || parsed.functionalConsequence.length === 0 ||
      typeof parsed.technical !== "string" || parsed.technical.length === 0 ||
      !isValidUserImpact(parsed.userImpact)
    ) {
      return { ...fallbackResult(issue), technical: tb.text.slice(0, 300) };
    }
    return parsed as AnalysisResult;
  } catch {
    return { ...fallbackResult(issue), technical: tb.text.slice(0, 300) };
  }
}

function fallbackResult(issue: IssueInput): AnalysisResult {
  return {
    urgency: "medium",
    trigger: FALLBACK_TRIGGER,
    functionalConsequence: FALLBACK_CONSEQUENCE,
    userImpact: FALLBACK_USER_IMPACT,
    technical: `${issue.issueTitle} — ${FALLBACK_TECHNICAL}`,
  };
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
  const adminEmail = process.env.SENTRY_ALERT_EMAIL ?? "ddreptate@gmail.com";
  const urgencyLabel = URGENCY_LABELS[analysis.urgency] ?? "INCONNUE";

  await resend.emails.send({
    from: getSender(),
    to: adminEmail,
    subject: `[Sentry ${urgencyLabel}] ${issue.issueShortId} — ${issue.issueTitle.slice(0, 80)}`,
    react: SentryIssueAnalysisEmail({
      issueShortId: issue.issueShortId,
      issueTitle: issue.issueTitle,
      urgency: analysis.urgency,
      urgencyLabel,
      trigger: analysis.trigger,
      functionalConsequence: analysis.functionalConsequence,
      userImpact: analysis.userImpact,
      technical: analysis.technical,
      sentryUrl,
    }),
  });
}

export async function analyzeSentryIssue(issue: IssueInput): Promise<void> {
  const token = process.env.SENTRY_AUTH_TOKEN;
  if (!token) return;

  const sentryOrg = process.env.SENTRY_ORG ?? "the-playground-id";

  // 1. Fetch latest event with stacktrace + tags + request
  const event = await fetchLatestEvent(issue.issueId, token);
  const context: EventContext = event
    ? extractEventContext(event)
    : { stacktrace: "", tags: {} };

  // 2. Analyze with Claude
  const analysis = await analyzeWithClaude(issue, context);

  // 3. Send Slack + email (if enabled)
  const sentryUrl = `https://${sentryOrg}.sentry.io/issues/${issue.issueId}/`;
  const urgencyLabel = URGENCY_LABELS[analysis.urgency] ?? "INCONNUE";
  await Promise.all([
    isAdminEmailEnabled() ? sendAnalysisEmail(issue, analysis, sentryUrl) : Promise.resolve(),
    notifySlackSentryIssue({
      issueShortId: issue.issueShortId,
      issueTitle: issue.issueTitle,
      urgencyLabel,
      trigger: analysis.trigger,
      functionalConsequence: analysis.functionalConsequence,
      userImpact: analysis.userImpact,
      technical: analysis.technical,
      sentryUrl,
    }),
  ]);
}

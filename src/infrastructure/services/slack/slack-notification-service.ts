import { URGENCY_META, USER_IMPACT_META, type AnalysisResult } from "../sentry/analysis-meta";

const WEBHOOK_URL = process.env.SLACK_ADMIN_WEBHOOK_URL;

export function isAdminEmailEnabled(): boolean {
  return process.env.ADMIN_NOTIFICATIONS_EMAIL !== "false";
}

type SlackBlock =
  | { type: "header"; text: { type: "plain_text"; text: string; emoji: true } }
  | { type: "section"; text: { type: "mrkdwn"; text: string }; fields?: undefined }
  | { type: "section"; fields: { type: "mrkdwn"; text: string }[]; text?: undefined }
  | { type: "divider" }
  | { type: "context"; elements: { type: "mrkdwn"; text: string }[] }
  | { type: "actions"; elements: { type: "button"; text: { type: "plain_text"; text: string }; url: string; style?: "primary" | "danger" }[] };

async function sendSlack(payload: { text: string; blocks?: SlackBlock[] }): Promise<void> {
  if (!WEBHOOK_URL) return;

  // Guard symétrique avec safe-resend : seul VERCEL_ENV=production laisse
  // passer. Tout le reste (preview, staging, local, CI) bloque — fail-closed.
  if (process.env.VERCEL_ENV !== "production") {
    console.warn("[staging-guard] Blocked Slack notification:", payload.text);
    return;
  }

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Silent failure — Slack is best-effort, never block the main flow
  }
}

// --- Notifications admin ---

export async function notifySlackNewEntity(params: {
  entityType: "circle" | "moment";
  entityName: string;
  creatorName: string;
  creatorEmail: string;
  circleName?: string;
  entityUrl: string;
  momentDate?: string;
  locationText?: string;
}): Promise<void> {
  const isCircle = params.entityType === "circle";
  const icon = isCircle ? "🟣" : "📅";
  const label = isCircle ? "Nouvelle Communauté" : "Nouvel événement";

  const bodyParts = [`*${params.entityName}*`, `Par ${params.creatorName} (${params.creatorEmail})`];
  if (params.circleName) bodyParts.push(`Communauté : ${params.circleName}`);
  if (params.momentDate) bodyParts.push(`Date : ${params.momentDate}`);
  if (params.locationText) bodyParts.push(`Lieu : ${params.locationText}`);

  await sendSlack({
    text: `${icon} ${label} — ${params.entityName}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: `${icon} ${label}`, emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: bodyParts.join("\n") } },
      { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "Voir dans le dashboard" }, url: params.entityUrl }] },
    ],
  });
}

export async function notifySlackMomentUpdated(params: {
  momentTitle: string;
  circleName: string;
  hostName: string;
  hostEmail: string;
  momentUrl: string;
  momentDate: string;
  locationText: string;
  changedFields: string[];
}): Promise<void> {
  const bodyParts = [
    `*${params.momentTitle}*`,
    `Par ${params.hostName} (${params.hostEmail})`,
    `Communauté : ${params.circleName}`,
    `Date : ${params.momentDate}`,
    `Lieu : ${params.locationText}`,
  ];

  await sendSlack({
    text: `✏️ Événement modifié — ${params.momentTitle}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: "✏️ Événement modifié", emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: bodyParts.join("\n") } },
      { type: "section", text: { type: "mrkdwn", text: `*Champs modifiés*\n${params.changedFields.map((f) => `• ${f}`).join("\n")}` } },
      { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "Voir dans le dashboard" }, url: params.momentUrl }] },
    ],
  });
}

export async function notifySlackNewUser(params: {
  userName: string;
  userEmail: string;
  registeredAt: string;
  adminUsersUrl: string;
}): Promise<void> {
  await sendSlack({
    text: `👤 Nouvel utilisateur — ${params.userName}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: "👤 Nouvel utilisateur", emoji: true } },
      { type: "section", fields: [
        { type: "mrkdwn", text: `*Nom*\n${params.userName}` },
        { type: "mrkdwn", text: `*Email*\n${params.userEmail}` },
      ]},
      { type: "context", elements: [{ type: "mrkdwn", text: `Inscrit le ${params.registeredAt}` }] },
      { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "Voir les utilisateurs" }, url: params.adminUsersUrl }] },
    ],
  });
}

export async function notifySlackTrafficReport(params: {
  dashboardName: string;
  pageviews: number;
  uniqueVisitors: number;
  sessions: number;
  dashboardUrl: string;
}): Promise<void> {
  const summary = `*${params.pageviews}* pageviews · *${params.uniqueVisitors}* visiteurs uniques · *${params.sessions}* sessions`;
  await sendSlack({
    text: `📊 ${params.dashboardName} — ${params.pageviews} pv · ${params.uniqueVisitors} vis · ${params.sessions} sess`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: `📊 ${params.dashboardName}`, emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: summary } },
      { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "Ouvrir le dashboard" }, url: params.dashboardUrl }] },
    ],
  });
}

export async function notifySlackNewRegistration(params: {
  playerName: string;
  momentTitle: string;
  circleName: string;
  registrationInfo: string;
  momentUrl: string;
}): Promise<void> {
  await sendSlack({
    text: `🎟️ Nouvelle inscription — ${params.playerName} → ${params.momentTitle}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: "🎟️ Nouvelle inscription", emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: `*${params.playerName}* s'est inscrit à *${params.momentTitle}*` } },
      { type: "section", fields: [
        { type: "mrkdwn", text: `*Communauté*\n${params.circleName}` },
        { type: "mrkdwn", text: `*Inscriptions*\n${params.registrationInfo}` },
      ]},
      { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "Voir l'événement" }, url: params.momentUrl }] },
    ],
  });
}

export async function notifySlackNewComment(params: {
  playerName: string;
  momentTitle: string;
  commentPreview: string;
  momentUrl: string;
}): Promise<void> {
  await sendSlack({
    text: `💬 Nouveau commentaire — ${params.playerName} sur ${params.momentTitle}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: "💬 Nouveau commentaire", emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: `*${params.playerName}* a commenté sur *${params.momentTitle}*` } },
      { type: "section", text: { type: "mrkdwn", text: `> ${params.commentPreview}` } },
      { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "Voir l'événement" }, url: params.momentUrl }] },
    ],
  });
}

export async function notifySlackQuotaWarning(
  used: number,
  tier: number,
): Promise<void> {
  await sendSlack({
    text: `⚠️ Quota Resend à ${used}/100 aujourd'hui (seuil ${tier} dépassé)`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: "⚠️ Quota emails Resend", emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: `*${used}/100* emails envoyés aujourd'hui (plan gratuit).\nSeuil de *${tier}* dépassé.` } },
      { type: "context", elements: [{ type: "mrkdwn", text: "Au-delà de 100/jour, les envois sont bloqués jusqu'au lendemain. Pense à passer sur un plan payant." }] },
    ],
  });
}

export async function notifySlackSentryIssue(params: {
  issue: { issueShortId: string; issueTitle: string };
  analysis: AnalysisResult;
  sentryUrl: string;
}): Promise<void> {
  const { issue, analysis, sentryUrl } = params;
  const urgencyLabel = URGENCY_META[analysis.urgency].label;
  const impactMeta = USER_IMPACT_META[analysis.userImpact.level];
  await sendSlack({
    text: `🚨 [Sentry ${urgencyLabel}] ${issue.issueShortId} — ${issue.issueTitle}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: `🚨 Sentry — Urgence ${urgencyLabel}`, emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: `*${issue.issueShortId}*\n${issue.issueTitle}` } },
      { type: "divider" },
      { type: "section", text: { type: "mrkdwn", text: `*Déclencheur*\n${analysis.trigger}` } },
      { type: "section", text: { type: "mrkdwn", text: `*Conséquence fonctionnelle*\n${analysis.functionalConsequence}` } },
      { type: "section", text: { type: "mrkdwn", text: `${impactMeta.emoji} *${impactMeta.label}*\n${analysis.userImpact.description}` } },
      { type: "divider" },
      { type: "context", elements: [{ type: "mrkdwn", text: `_Détails techniques_\n\`\`\`${analysis.technical}\`\`\`` }] },
      { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "Voir dans Sentry" }, url: sentryUrl, style: "danger" }] },
    ],
  });
}

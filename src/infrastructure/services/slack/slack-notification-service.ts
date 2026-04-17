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
}): Promise<void> {
  const isCircle = params.entityType === "circle";
  const icon = isCircle ? "🟣" : "📅";
  const label = isCircle ? "Nouvelle Communaute" : "Nouvel evenement";

  const bodyParts = [`*${params.entityName}*`, `Par ${params.creatorName} (${params.creatorEmail})`];
  if (params.circleName) bodyParts.push(`Communaute : ${params.circleName}`);

  await sendSlack({
    text: `${icon} ${label} — ${params.entityName}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: `${icon} ${label}`, emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: bodyParts.join("\n") } },
      { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "Voir dans le dashboard" }, url: params.entityUrl }] },
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
      { type: "section", text: { type: "mrkdwn", text: `*${params.playerName}* s'est inscrit a *${params.momentTitle}*` } },
      { type: "section", fields: [
        { type: "mrkdwn", text: `*Communaute*\n${params.circleName}` },
        { type: "mrkdwn", text: `*Inscriptions*\n${params.registrationInfo}` },
      ]},
      { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "Voir l'evenement" }, url: params.momentUrl }] },
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
      { type: "section", text: { type: "mrkdwn", text: `*${params.playerName}* a commente sur *${params.momentTitle}*` } },
      { type: "section", text: { type: "mrkdwn", text: `> ${params.commentPreview}` } },
      { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "Voir l'evenement" }, url: params.momentUrl }] },
    ],
  });
}

type UserImpactSlackLevel = "none" | "silent" | "degraded" | "blocking";

const USER_IMPACT_SLACK: Record<UserImpactSlackLevel, { emoji: string; label: string }> = {
  none: { emoji: "🟢", label: "Aucun impact utilisateur" },
  silent: { emoji: "⚪", label: "Impact silencieux" },
  degraded: { emoji: "🟠", label: "Experience degradee" },
  blocking: { emoji: "🔴", label: "Utilisateur bloque" },
};

export async function notifySlackSentryIssue(params: {
  issueShortId: string;
  issueTitle: string;
  culprit: string;
  urgencyLabel: string;
  userImpact: { level: UserImpactSlackLevel; description: string };
  diagnosis: string;
  remediation: string;
  sentryUrl: string;
}): Promise<void> {
  const impactMeta = USER_IMPACT_SLACK[params.userImpact.level];
  await sendSlack({
    text: `🚨 [Sentry ${params.urgencyLabel}] ${params.issueShortId} — ${params.issueTitle}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: `🚨 Sentry — Urgence ${params.urgencyLabel}`, emoji: true } },
      { type: "section", text: { type: "mrkdwn", text: `*${params.issueShortId}*\n${params.issueTitle}` } },
      { type: "divider" },
      { type: "section", text: { type: "mrkdwn", text: `${impactMeta.emoji} *${impactMeta.label}*\n${params.userImpact.description}` } },
      { type: "divider" },
      { type: "section", fields: [
        { type: "mrkdwn", text: `*Culprit*\n\`${params.culprit}\`` },
      ]},
      { type: "section", text: { type: "mrkdwn", text: `*Diagnostic*\n${params.diagnosis}` } },
      { type: "section", text: { type: "mrkdwn", text: `*Remediation*\n${params.remediation}` } },
      { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "Voir dans Sentry" }, url: params.sentryUrl, style: "danger" }] },
    ],
  });
}

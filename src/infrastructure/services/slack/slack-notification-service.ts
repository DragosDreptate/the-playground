const WEBHOOK_URL = process.env.SLACK_ADMIN_WEBHOOK_URL;

export async function sendSlackAdminNotification(text: string): Promise<void> {
  if (!WEBHOOK_URL) return;

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Silent failure — Slack is best-effort, never block the main flow
  }
}

// Project ID PostHog déjà utilisé dans les cron jobs reporting (eu.posthog.com).
const POSTHOG_PROJECT_ID = "134622";
const POSTHOG_HOST = "https://eu.posthog.com";

export function buildPostHogPersonUrl(distinctId: string): string {
  return `${POSTHOG_HOST}/project/${POSTHOG_PROJECT_ID}/person/${encodeURIComponent(distinctId)}`;
}

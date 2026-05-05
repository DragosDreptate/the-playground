const DEFAULT_SENTRY_ORG = "the-playground-id";

function getSentryOrg(): string {
  return process.env.SENTRY_ORG ?? DEFAULT_SENTRY_ORG;
}

export function buildSentryIssueUrl(issueId: string): string {
  return `https://${getSentryOrg()}.sentry.io/issues/${issueId}/`;
}

export function buildSentryIssuesSearchUrl(query: string): string {
  return `https://${getSentryOrg()}.sentry.io/issues/?query=${encodeURIComponent(query)}`;
}

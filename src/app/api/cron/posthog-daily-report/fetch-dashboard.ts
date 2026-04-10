/**
 * Minimal types + fetcher for the PostHog Dashboard API (EU region).
 *
 * We only model the fields we actually consume in the report builder.
 * See https://posthog.com/docs/api/dashboards for the full response shape.
 */

const POSTHOG_BASE_URL = "https://eu.posthog.com";
const POSTHOG_PROJECT_ID = 134622;

export interface PosthogSeries {
  label: string;
  count?: number;
  aggregated_value?: number;
  data?: number[];
  days?: string[];
}

export interface PosthogInsight {
  id: number;
  short_id: string;
  name: string;
  description: string | null;
  result: PosthogSeries[] | null;
}

export interface PosthogTile {
  id: number;
  insight: PosthogInsight | null;
}

export interface PosthogDashboard {
  id: number;
  name: string;
  description: string | null;
  tiles: PosthogTile[];
}

export class PosthogFetchError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "PosthogFetchError";
  }
}

export async function fetchPosthogDashboard(
  dashboardId: number
): Promise<PosthogDashboard> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!apiKey) {
    throw new PosthogFetchError(
      "POSTHOG_PERSONAL_API_KEY is not configured",
      500
    );
  }

  const url = `${POSTHOG_BASE_URL}/api/projects/${POSTHOG_PROJECT_ID}/dashboards/${dashboardId}/`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new PosthogFetchError(
      `PostHog dashboard fetch failed (${response.status} ${response.statusText})`,
      response.status
    );
  }

  return (await response.json()) as PosthogDashboard;
}

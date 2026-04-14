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

  // `refresh=force_blocking` : force PostHog à recalculer synchroniquement toutes
  // les insights du dashboard avant de retourner la réponse, en ignorant le cache.
  // Sans ce paramètre, PostHog renvoie le dernier cache — qui peut dater de la
  // dernière consultation manuelle du dashboard, donc donner un rapport périmé
  // (vu en prod : rapport généré à J affichant la période J-2 → J-1).
  // Mesuré en local : ~7s pour le daily dashboard (5 tiles), ~8s pour le weekly.
  // Couvert côté route par `export const maxDuration = 60`.
  const url = `${POSTHOG_BASE_URL}/api/projects/${POSTHOG_PROJECT_ID}/dashboards/${dashboardId}/?refresh=force_blocking`;
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

const PAGEVIEWS_INSIGHT_PREFIX = "Pageviews & visiteurs uniques";
const UV_TOTAL_INSIGHT_PREFIX = "Visiteurs uniques (total)";

/**
 * Extrait le vrai nombre de visiteurs uniques depuis la tile "Visiteurs uniques
 * (total)" du dashboard (insight BoldNumber, `aggregated_value` dédupliqué),
 * puis corrige le `.count` gonflé dans la tile "Pageviews & visiteurs uniques".
 *
 * Retourne le vrai nombre de visiteurs uniques, ou null si la tile est absente.
 */
export function patchUniqueVisitors(dashboard: PosthogDashboard): number | null {
  const uvInsight = dashboard.tiles.find((t) =>
    t.insight?.name.startsWith(UV_TOTAL_INSIGHT_PREFIX)
  )?.insight;
  const trueCount = uvInsight?.result?.[0]?.aggregated_value;
  if (trueCount == null) return null;

  const rounded = Math.round(trueCount);
  const pvInsight = dashboard.tiles.find((t) =>
    t.insight?.name.startsWith(PAGEVIEWS_INSIGHT_PREFIX)
  )?.insight;
  if (pvInsight?.result?.[1]) {
    pvInsight.result[1] = { ...pvInsight.result[1], count: rounded };
  }
  return rounded;
}

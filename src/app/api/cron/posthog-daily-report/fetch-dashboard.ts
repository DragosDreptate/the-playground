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

/**
 * Source d'une insight PostHog (TrendsQuery, LifecycleQuery, …) telle que
 * renvoyée dans `insight.query.source`. On ne modélise finement que
 * `dateRange` (la seule partie qu'on réécrit) ; le reste est conservé tel
 * quel et renvoyé à l'API /query pour rejouer la requête sur une autre fenêtre.
 */
export interface PosthogQuerySource {
  kind: string;
  dateRange?: {
    date_from?: string | null;
    date_to?: string | null;
    explicitDate?: boolean;
  } | null;
  [key: string]: unknown;
}

export interface PosthogInsightQuery {
  kind: string;
  source: PosthogQuerySource;
}

export interface PosthogInsight {
  id: number;
  short_id: string;
  name: string;
  description: string | null;
  result: PosthogSeries[] | null;
  /** Définition de la requête — utilisée pour rejouer la tile sur une autre période. */
  query?: PosthogInsightQuery | null;
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
  dashboardId: number,
  { forceRefresh = true }: { forceRefresh?: boolean } = {}
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
  //
  // `forceRefresh: false` : le rapport quotidien n'a pas besoin de recalculer
  // les résultats du dashboard (configuré sur « aujourd'hui »), puisqu'il les
  // réécrit ensuite sur « hier » via overrideDailyTilesToYesterday. On évite
  // ainsi un recalcul inutile (et lent) côté today. La définition des requêtes
  // (`insight.query`) est renvoyée par l'API quel que soit le refresh.
  const refreshParam = forceRefresh ? "?refresh=force_blocking" : "";
  const url = `${POSTHOG_BASE_URL}/api/projects/${POSTHOG_PROJECT_ID}/dashboards/${dashboardId}/${refreshParam}`;
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

/**
 * Fenêtre « hier complet » au sens PostHog : de minuit à minuit (timezone du
 * projet), recalculée à chaque exécution. C'est la période que doit couvrir
 * le rapport matinal.
 */
const YESTERDAY_RANGE = {
  date_from: "-1dStart",
  date_to: "-1dEnd",
  explicitDate: false,
} as const;

/**
 * Réécrit les tiles Trends du dashboard quotidien sur la journée d'HIER, en
 * remplaçant `insight.result` par le résultat recalculé via l'API /query.
 *
 * Pourquoi : le dashboard quotidien est configuré sur « aujourd'hui depuis
 * minuit » (consultation live), mais le rapport matinal de 8h doit résumer la
 * veille complète. Plutôt que de dupliquer le dashboard, on garde une source
 * unique et on rejoue chaque requête sur la bonne fenêtre.
 *
 * Seules les tiles `TrendsQuery` sont rejouées : le rapport ne consomme pas la
 * tile Lifecycle (qui a besoin de son historique 30j et n'a pas de sens sur un
 * seul jour). Les requêtes sont rejouées en parallèle, avec `force_blocking`
 * pour garantir des chiffres frais.
 */
export async function overrideDailyTilesToYesterday(
  dashboard: PosthogDashboard
): Promise<void> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!apiKey) {
    throw new PosthogFetchError(
      "POSTHOG_PERSONAL_API_KEY is not configured",
      500
    );
  }

  const trendsInsights = dashboard.tiles
    .map((t) => t.insight)
    .filter(
      (i): i is PosthogInsight => i?.query?.source?.kind === "TrendsQuery"
    );

  await Promise.all(
    trendsInsights.map(async (insight) => {
      const source: PosthogQuerySource = {
        ...insight.query!.source,
        dateRange: YESTERDAY_RANGE,
      };

      const response = await fetch(
        `${POSTHOG_BASE_URL}/api/projects/${POSTHOG_PROJECT_ID}/query/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({ query: source, refresh: "force_blocking" }),
        }
      );

      if (!response.ok) {
        throw new PosthogFetchError(
          `PostHog query failed for insight "${insight.name}" (${response.status} ${response.statusText})`,
          response.status
        );
      }

      const data = (await response.json()) as { results: PosthogSeries[] };
      insight.result = data.results;
    })
  );
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

const NEW_VISITORS_INSIGHT_PREFIX = "Primo-visiteurs";

/**
 * Extrait le nombre de primo-visiteurs (personnes dont la toute première venue
 * tombe dans la période) depuis la tile "Primo-visiteurs" (insight BoldNumber,
 * math `first_time_for_user`, `aggregated_value`).
 *
 * Retourne le nombre de primo-visiteurs, ou null si la tile est absente — le
 * rapport masque alors la répartition primo / revenants (dégradation propre
 * tant que la tile n'a pas été ajoutée au dashboard).
 */
export function extractNewVisitors(dashboard: PosthogDashboard): number | null {
  const insight = dashboard.tiles.find((t) =>
    t.insight?.name.startsWith(NEW_VISITORS_INSIGHT_PREFIX)
  )?.insight;
  const value = insight?.result?.[0]?.aggregated_value;
  if (value == null) return null;
  return Math.round(value);
}

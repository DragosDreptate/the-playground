import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  overrideDailyTilesToYesterday,
  PosthogFetchError,
  type PosthogDashboard,
} from "../fetch-dashboard";

/**
 * Construit un dashboard quotidien minimal : une tile Trends (BoldNumber) et
 * une tile Lifecycle, chacune configurée sur « aujourd'hui depuis minuit »
 * (dStart). C'est l'état réel du dashboard 601861 après bascule live.
 */
function dailyDashboard(): PosthogDashboard {
  return {
    id: 601861,
    name: "Synthèse trafic quotidienne",
    description: null,
    tiles: [
      {
        id: 1,
        insight: {
          id: 3841046,
          short_id: "uv",
          name: "Visiteurs uniques (total) – 24h",
          description: null,
          result: [{ label: "Pageview", aggregated_value: 12 }],
          query: {
            kind: "InsightVizNode",
            source: {
              kind: "TrendsQuery",
              dateRange: { date_from: "dStart", date_to: null },
              series: [{ event: "$pageview", math: "dau" }],
            },
          },
        },
      },
      {
        id: 2,
        insight: {
          id: 4629813,
          short_id: "life",
          name: "Cycle de vie des visiteurs – 30j",
          description: null,
          result: [{ label: "new", count: 6 }],
          query: {
            kind: "InsightVizNode",
            source: {
              kind: "LifecycleQuery",
              dateRange: { date_from: "-30d", date_to: null },
              series: [{ event: "$pageview", math: "total" }],
            },
          },
        },
      },
    ],
  };
}

describe("overrideDailyTilesToYesterday", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env.POSTHOG_PERSONAL_API_KEY = "test-key";
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("given a daily dashboard configured on today", () => {
    it("should replay the Trends tile on yesterday and replace its result", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ results: [{ label: "Pageview", aggregated_value: 30 }] }),
      });

      const dashboard = dailyDashboard();
      await overrideDailyTilesToYesterday(dashboard);

      // Le résultat de la tile Trends est désormais celui d'hier (30, pas 12).
      const trends = dashboard.tiles[0].insight!;
      expect(trends.result).toEqual([
        { label: "Pageview", aggregated_value: 30 },
      ]);

      // La requête envoyée force la fenêtre « hier complet ».
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse(init.body as string);
      expect(body.query.dateRange).toEqual({
        date_from: "-1dStart",
        date_to: "-1dEnd",
        explicitDate: false,
      });
      expect(body.refresh).toBe("force_blocking");
      // Le reste de la requête (event, math) est préservé.
      expect(body.query.series).toEqual([{ event: "$pageview", math: "dau" }]);
    });

    it("should leave the Lifecycle tile untouched (not a TrendsQuery)", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ results: [{ label: "Pageview", aggregated_value: 30 }] }),
      });

      const dashboard = dailyDashboard();
      const lifecycleResultBefore = dashboard.tiles[1].insight!.result;

      await overrideDailyTilesToYesterday(dashboard);

      // Une seule requête (la Trends) ; la Lifecycle n'est pas rejouée.
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(dashboard.tiles[1].insight!.result).toBe(lifecycleResultBefore);
    });
  });

  describe("given the PostHog API fails", () => {
    it("should throw a PosthogFetchError mentioning the insight name", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        json: async () => ({}),
      });

      await expect(
        overrideDailyTilesToYesterday(dailyDashboard())
      ).rejects.toThrowError(PosthogFetchError);
    });
  });

  describe("given the API key is missing", () => {
    it("should throw before any network call", async () => {
      delete process.env.POSTHOG_PERSONAL_API_KEY;

      await expect(
        overrideDailyTilesToYesterday(dailyDashboard())
      ).rejects.toThrowError(/POSTHOG_PERSONAL_API_KEY/);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});

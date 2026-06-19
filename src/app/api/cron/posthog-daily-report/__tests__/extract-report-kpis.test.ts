import { describe, it, expect } from "vitest";
import { extractReportKpis } from "../extract-report-kpis";
import type { PosthogDashboard } from "../fetch-dashboard";

function dashboardWith(options: {
  uniqueVisitors: number;
  newVisitors?: number;
}): PosthogDashboard {
  const tiles: PosthogDashboard["tiles"] = [
    {
      id: 1,
      insight: {
        id: 1,
        short_id: "pv24h",
        name: "Pageviews & visiteurs uniques – 24h",
        description: null,
        result: [
          { label: "Pageviews", count: 100 },
          { label: "Visiteurs uniques", count: options.uniqueVisitors },
        ],
      },
    },
  ];
  if (options.newVisitors != null) {
    tiles.push({
      id: 2,
      insight: {
        id: 2,
        short_id: "primo24h",
        name: "Primo-visiteurs – 24h",
        description: null,
        result: [{ label: "Pageview", aggregated_value: options.newVisitors }],
      },
    });
  }
  return { id: 1, name: "Test", description: null, tiles };
}

describe("extractReportKpis", () => {
  describe("given no Primo-visiteurs tile", () => {
    it("should return null for newVisitors and returningVisitors", () => {
      const kpis = extractReportKpis(dashboardWith({ uniqueVisitors: 25 }));
      expect(kpis.newVisitors).toBeNull();
      expect(kpis.returningVisitors).toBeNull();
    });
  });

  describe("given a Primo-visiteurs tile", () => {
    it("should compute returningVisitors as unique minus new", () => {
      const kpis = extractReportKpis(
        dashboardWith({ uniqueVisitors: 25, newVisitors: 10 })
      );
      expect(kpis.newVisitors).toBe(10);
      expect(kpis.returningVisitors).toBe(15);
    });

    it("should clamp returningVisitors to 0 when new exceeds unique (data skew)", () => {
      const kpis = extractReportKpis(
        dashboardWith({ uniqueVisitors: 5, newVisitors: 8 })
      );
      expect(kpis.newVisitors).toBe(8);
      expect(kpis.returningVisitors).toBe(0);
    });
  });
});

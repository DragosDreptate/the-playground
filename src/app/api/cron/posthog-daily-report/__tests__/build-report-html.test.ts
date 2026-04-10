import { describe, it, expect } from "vitest";
import { buildReportHtml } from "../build-report-html";
import type { PosthogDashboard } from "../fetch-dashboard";
import realDashboard from "./fixtures/dashboard.json";

const fixedDate = new Date("2026-04-10T20:30:00Z");

describe("buildReportHtml", () => {
  describe("given a real PostHog dashboard fixture", () => {
    const html = buildReportHtml(
      realDashboard as unknown as PosthogDashboard,
      fixedDate
    );

    it("should be a valid standalone HTML document", () => {
      expect(html).toMatch(/^<!DOCTYPE html>/);
      expect(html).toContain("</html>");
    });

    it("should include the dashboard name in the header", () => {
      expect(html).toContain("Synthèse trafic quotidienne");
    });

    it("should render pageviews, unique visitors and sessions KPIs", () => {
      // From fixture: pageviews=70, unique_visitors=25, sessions=25
      expect(html).toMatch(/Pageviews<\/p>\s*<p[^>]*>70</);
      expect(html).toMatch(/Visiteurs uniques<\/p>\s*<p[^>]*>25</);
      expect(html).toMatch(/Sessions<\/p>\s*<p[^>]*>25</);
    });

    it("should compute the pageviews-per-visitor ratio", () => {
      // 70 / 25 = 2.8
      expect(html).toContain("2.80 pv / visiteur");
    });

    it("should render all labelled interaction rows", () => {
      // Labels are HTML-escaped, so apostrophes become &#39;
      expect(html).toContain("Vues d&#39;événement");
      expect(html).toContain("Vues de Communauté");
      expect(html).toContain("Événements créés");
      expect(html).toContain("Communautés créées");
    });

    it("should render the interaction analysis with the event/community ratio", () => {
      // Fixture: moment_viewed=14, circle_viewed=4 → ratio 3.5×
      expect(html).toContain("ratio événement/Communauté");
      expect(html).toContain("3.5×");
    });

    it("should render the engagement conversion rate when there are inscriptions", () => {
      // Fixture: moment_joined=2, moment_viewed=14 → 14.3%
      expect(html).toContain("Taux de conversion événement");
      expect(html).toContain("14.3%");
    });

    it("should render the top pages table sorted by value descending", () => {
      // Fixture top page: /dashboard with aggregated_value=9
      const dashboardIdx = html.indexOf("/dashboard<");
      const homeIdx = html.indexOf(">/<"); // root page "/"
      expect(dashboardIdx).toBeGreaterThan(-1);
      expect(homeIdx).toBeGreaterThan(-1);
      expect(dashboardIdx).toBeLessThan(homeIdx);
    });

    it("should render the 'Other pages' row when breakdown_other is present", () => {
      expect(html).toContain("Autres pages (hors top 10)");
    });

    it("should not leak the breakdown_other internal label", () => {
      expect(html).not.toContain("$$_posthog_breakdown_other_$$");
    });

    it("should render the hourly distribution rows", () => {
      // Fixture has 25 hourly data points; we expect at least one bar row
      expect(html).toContain("Distribution horaire");
      expect(html).toMatch(/<div style="background:linear-gradient\(90deg,#ec4899,#a855f7\)/);
    });

    it("should include a link back to the source dashboard", () => {
      expect(html).toContain(
        "https://eu.posthog.com/project/134622/dashboard/601861"
      );
    });

    it("should include the generation timestamp in dd/mm/yyyy format", () => {
      // 2026-04-10 20:30 UTC → 22:30 local summer time varies; we just check the date part
      expect(html).toMatch(/10\/04\/2026/);
    });
  });

  describe("given an empty dashboard", () => {
    const empty: PosthogDashboard = {
      id: 1,
      name: "Empty",
      description: null,
      tiles: [],
    };

    it("should still render a valid HTML document", () => {
      const html = buildReportHtml(empty, fixedDate);
      expect(html).toMatch(/^<!DOCTYPE html>/);
      expect(html).toContain("</html>");
      expect(html).toContain("Empty");
    });

    it("should render zeros for all KPIs", () => {
      const html = buildReportHtml(empty, fixedDate);
      expect(html).toMatch(/Pageviews<\/p>\s*<p[^>]*>0</);
      expect(html).toMatch(/Visiteurs uniques<\/p>\s*<p[^>]*>0</);
      expect(html).toMatch(/Sessions<\/p>\s*<p[^>]*>0</);
    });

    it("should render the 'no engagement' analysis text", () => {
      const html = buildReportHtml(empty, fixedDate);
      expect(html).toContain(
        "Aucune action d'engagement enregistrée sur la période"
      );
    });
  });

  describe("given a dashboard with special characters in the name", () => {
    it("should escape HTML in the dashboard name to prevent injection", () => {
      const injected: PosthogDashboard = {
        id: 1,
        name: "<script>alert(1)</script>",
        description: null,
        tiles: [],
      };
      const html = buildReportHtml(injected, fixedDate);
      expect(html).not.toContain("<script>alert(1)</script>");
      expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    });
  });
});

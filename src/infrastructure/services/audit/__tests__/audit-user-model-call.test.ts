import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AuditDossier } from "@/infrastructure/services/audit/types";

const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
  },
}));

const dossier: AuditDossier = {
  found: true,
  identifier: "deepak@example.com",
  account: {
    id: "u1",
    email: "deepak@example.com",
    name: "Deepak R",
    firstName: "Deepak",
    lastName: "R",
    createdAt: "2026-06-01T00:00:00.000Z",
    onboardingCompleted: true,
    publicId: "user-1",
    emailVerified: true,
    dashboardMode: null,
    hasAvatar: false,
    providers: [],
  },
};
vi.mock("@/infrastructure/services/audit/gather-user-audit-data", () => ({
  gatherUserAuditData: async () => dossier,
}));

const { auditUser } = await import("@/infrastructure/services/audit/audit-user");

const validReport = JSON.stringify({
  identitySummary: "Compte X.",
  contentSummary: "1 Communauté.",
  behaviorSummary: "Normal.",
  signalsFor: [],
  signalsAgainst: ["contenu cohérent"],
  verdictLean: "likely_legit",
  recommendation: "Ignorer.",
});

describe("auditUser — appel au modèle", () => {
  beforeEach(() => {
    create.mockReset();
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("given the answer is cut by the token ceiling", () => {
    it("should say the answer was truncated", async () => {
      create.mockResolvedValue({
        stop_reason: "max_tokens",
        content: [{ type: "text", text: "{\"identitySummary\": \"Comp" }],
        usage: { input_tokens: 100, output_tokens: 8000 },
      });

      const { report } = await auditUser("deepak@example.com");

      expect(report.identitySummary).toContain("tronquée");
    });
  });

  describe("given the model refuses the analysis", () => {
    it("should fall back on the raw dossier and say it was a refusal", async () => {
      create.mockResolvedValue({ stop_reason: "refusal", content: [], usage: { input_tokens: 1, output_tokens: 0 } });

      const { report } = await auditUser("deepak@example.com");

      expect(report.verdictLean).toBe("ambiguous");
      expect(report.identitySummary).toContain("refusé l'analyse");
    });
  });

  describe("given the answer starts with a thinking block", () => {
    it("should read the report from the text block", async () => {
      create.mockResolvedValue({
        stop_reason: "end_turn",
        content: [
          { type: "thinking", thinking: "", signature: "s" },
          { type: "text", text: validReport },
        ],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const { report } = await auditUser("deepak@example.com");

      expect(report.verdictLean).toBe("likely_legit");
    });
  });
});

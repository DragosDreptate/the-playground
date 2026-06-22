import { describe, it, expect } from "vitest";

import { parseAuditReport } from "@/infrastructure/services/audit/audit-user";
import { buildAuditPrompt } from "@/infrastructure/services/audit/build-audit-prompt";
import type { AuditDossier } from "@/infrastructure/services/audit/types";

const validJson = JSON.stringify({
  identitySummary: "Compte X, Google, créé hier, Paris.",
  contentSummary: "1 Communauté pub vers un site externe.",
  behaviorSummary: "Vélocité élevée.",
  signalsFor: ["website externe commercial"],
  signalsAgainst: [],
  verdictLean: "likely_spam",
  recommendation: "Surveiller, décision humaine.",
});

describe("parseAuditReport", () => {
  it("should parse un JSON valide entouré de texte", () => {
    const r = parseAuditReport(`Voici le rapport :\n${validJson}\nFin.`);
    expect(r?.verdictLean).toBe("likely_spam");
    expect(r?.signalsFor).toEqual(["website externe commercial"]);
  });

  it("should renvoyer null si identitySummary manque", () => {
    expect(parseAuditReport(JSON.stringify({ verdictLean: "ambiguous" }))).toBeNull();
  });

  it("should renvoyer null si verdictLean est invalide", () => {
    expect(
      parseAuditReport(JSON.stringify({ identitySummary: "x", verdictLean: "nope" }))
    ).toBeNull();
  });

  it("should coercer des signaux non-array en []", () => {
    const r = parseAuditReport(
      JSON.stringify({
        identitySummary: "x",
        verdictLean: "likely_legit",
        signalsFor: "pas un tableau",
      })
    );
    expect(r?.signalsFor).toEqual([]);
  });

  it("should renvoyer null sur du non-JSON", () => {
    expect(parseAuditReport("bla bla pas de json")).toBeNull();
  });
});

describe("buildAuditPrompt", () => {
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

  it("should inclure le dossier et les leçons clés", () => {
    const prompt = buildAuditPrompt(dossier);
    expect(prompt).toContain("deepak@example.com");
    expect(prompt).toContain("discrimine"); // leçon : la mécanique ne discrimine pas
    expect(prompt).toContain("verdictLean"); // demande la sortie structurée
  });
});

import { describe, expect, it } from "vitest";

import { parseAnalysisResult } from "../analysis-result";

const VALID_RESPONSE = {
  urgency: "high",
  trigger: "Un organisateur publie un événement",
  functionalConsequence: "La publication n'aboutit pas",
  userImpact: { level: "blocking", description: "Un organisateur voit un écran d'erreur" },
  technical: "createMoment lève une contrainte unique",
};

describe("parseAnalysisResult", () => {
  describe("given une réponse conforme au schéma demandé", () => {
    it("should la conserver telle quelle, sans réécrire le verdict", () => {
      expect(parseAnalysisResult(VALID_RESPONSE)).toEqual(VALID_RESPONSE);
    });

    it("should ignorer les clés que le modèle a inventées", () => {
      const parsed = parseAnalysisResult({ ...VALID_RESPONSE, suggestedFix: "redéployer" });
      expect(parsed).not.toHaveProperty("suggestedFix");
    });
  });

  describe("given des énumérations écrites avec une casse ou des espaces différents", () => {
    // Un modèle écrit « High » ou « high » d'une réponse à l'autre. Sans
    // normalisation, toute l'analyse était jetée au profit d'un message vide.
    it("should accepter une urgence capitalisée", () => {
      expect(parseAnalysisResult({ ...VALID_RESPONSE, urgency: "High" })?.urgency).toBe("high");
    });

    it("should accepter un niveau d'impact entouré d'espaces", () => {
      const parsed = parseAnalysisResult({
        ...VALID_RESPONSE,
        userImpact: { ...VALID_RESPONSE.userImpact, level: " Blocking " },
      });
      expect(parsed?.userImpact.level).toBe("blocking");
    });
  });

  describe("given une réponse inexploitable", () => {
    it("should la rejeter plutôt que d'en deviner le sens", () => {
      expect(parseAnalysisResult(null)).toBeNull();
      expect(parseAnalysisResult("pas du JSON")).toBeNull();
      expect(parseAnalysisResult({ ...VALID_RESPONSE, urgency: "PANIQUE" })).toBeNull();
      expect(parseAnalysisResult({ ...VALID_RESPONSE, trigger: "   " })).toBeNull();
      expect(
        parseAnalysisResult({ ...VALID_RESPONSE, userImpact: { level: "blocking" } })
      ).toBeNull();
    });
  });
});

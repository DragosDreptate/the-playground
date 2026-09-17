import { describe, expect, it } from "vitest";

import { capUrgencyForConfidence, parseAnalysisResult } from "../analysis-result";

const VALID_RESPONSE = {
  urgency: "high",
  confidence: "certain",
  trigger: "Un organisateur publie un événement",
  functionalConsequence: "La publication n'aboutit pas",
  userImpact: { level: "blocking", description: "Un organisateur voit un écran d'erreur" },
  technical: "createMoment lève une contrainte unique",
};

describe("capUrgencyForConfidence", () => {
  it("plafonne à MOYENNE quand le diagnostic est incertain", () => {
    expect(capUrgencyForConfidence("critical", "incertain")).toBe("medium");
    expect(capUrgencyForConfidence("high", "incertain")).toBe("medium");
  });

  it("ne remonte jamais une urgence faible", () => {
    expect(capUrgencyForConfidence("low", "incertain")).toBe("low");
    expect(capUrgencyForConfidence("noise", "incertain")).toBe("noise");
  });

  it("laisse intacte une urgence haute quand le diagnostic est sûr", () => {
    expect(capUrgencyForConfidence("critical", "certain")).toBe("critical");
    expect(capUrgencyForConfidence("high", "probable")).toBe("high");
  });
});

describe("parseAnalysisResult", () => {
  it("accepte une réponse complète", () => {
    expect(parseAnalysisResult(VALID_RESPONSE)).toEqual(VALID_RESPONSE);
  });

  it("applique le plafond d'urgence à une analyse incertaine", () => {
    const parsed = parseAnalysisResult({ ...VALID_RESPONSE, confidence: "incertain" });
    expect(parsed?.urgency).toBe("medium");
    expect(parsed?.confidence).toBe("incertain");
  });

  it("conserve une analyse valide dont le champ confidence manque", () => {
    const { confidence: _omitted, ...withoutConfidence } = VALID_RESPONSE;
    const parsed = parseAnalysisResult(withoutConfidence);
    // Une omission ne doit PAS détruire un diagnostic par ailleurs correct.
    expect(parsed?.confidence).toBe("probable");
    expect(parsed?.urgency).toBe("high");
    expect(parsed?.trigger).toBe(VALID_RESPONSE.trigger);
  });

  it("retombe sur la valeur par défaut si confidence est inconnue", () => {
    expect(parseAnalysisResult({ ...VALID_RESPONSE, confidence: "sûr à 80%" })?.confidence).toBe(
      "probable"
    );
  });

  it("ne propage pas les clés inventées par le modèle", () => {
    const parsed = parseAnalysisResult({ ...VALID_RESPONSE, suggestedFix: "redéployer" });
    expect(parsed).not.toHaveProperty("suggestedFix");
  });

  it("rejette une réponse inexploitable", () => {
    expect(parseAnalysisResult(null)).toBeNull();
    expect(parseAnalysisResult("pas du JSON")).toBeNull();
    expect(parseAnalysisResult({ ...VALID_RESPONSE, urgency: "PANIQUE" })).toBeNull();
    expect(parseAnalysisResult({ ...VALID_RESPONSE, trigger: "   " })).toBeNull();
    expect(parseAnalysisResult({ ...VALID_RESPONSE, userImpact: { level: "blocking" } })).toBeNull();
  });
});

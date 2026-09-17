import { describe, expect, it } from "vitest";

import {
  capUrgencyForConfidence,
  capUserImpactForConfidence,
  parseAnalysisResult,
} from "../analysis-result";

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

describe("capUserImpactForConfidence", () => {
  it("abaisse « utilisateur bloqué » à « dégradé » sur un diagnostic incertain", () => {
    expect(capUserImpactForConfidence("blocking", "incertain")).toBe("degraded");
  });

  it("ne remonte jamais un impact annoncé nul ou silencieux", () => {
    expect(capUserImpactForConfidence("none", "incertain")).toBe("none");
    expect(capUserImpactForConfidence("silent", "incertain")).toBe("silent");
  });

  it("laisse intact un impact bloquant si le diagnostic est sûr", () => {
    expect(capUserImpactForConfidence("blocking", "certain")).toBe("blocking");
    expect(capUserImpactForConfidence("blocking", "probable")).toBe("blocking");
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

  it("plafonne aussi l'impact utilisateur, pour que les deux moitiés du message s'accordent", () => {
    // Sans ça : en-tête jaune « MOYENNE » et bandeau rouge « UTILISATEUR
    // BLOQUÉ » dans le même message.
    const parsed = parseAnalysisResult({ ...VALID_RESPONSE, confidence: "incertain" });
    expect(parsed?.userImpact.level).toBe("degraded");
    expect(parsed?.userImpact.description).toBe(VALID_RESPONSE.userImpact.description);
  });

  it("conserve l'analyse mais la traite comme incertaine si confidence manque", () => {
    const { confidence: _omitted, ...withoutConfidence } = VALID_RESPONSE;
    const parsed = parseAnalysisResult(withoutConfidence);
    // Tolérant sur la forme : le diagnostic est gardé...
    expect(parsed?.trigger).toBe(VALID_RESPONSE.trigger);
    // ...mais prudent sur le fond : une réponse muette ne prouve pas sa
    // fiabilité, donc le plafond s'applique. Sinon D1 se contourne par
    // l'ABSENCE du champ.
    expect(parsed?.confidence).toBe("incertain");
    expect(parsed?.urgency).toBe("medium");
    expect(parsed?.userImpact.level).toBe("degraded");
  });

  it("traite une valeur de confidence inconnue comme incertaine", () => {
    const parsed = parseAnalysisResult({ ...VALID_RESPONSE, confidence: "sûr à 80%" });
    expect(parsed?.confidence).toBe("incertain");
    expect(parsed?.urgency).toBe("medium");
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

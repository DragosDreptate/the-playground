import { describe, expect, it } from "vitest";

import { capUrgencyForConfidence, parseAnalysisResult } from "../analysis-result";
import { resolveImpactDisplay } from "../analysis-meta";

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

describe("resolveImpactDisplay", () => {
  it("affiche l'incertitude au lieu de rabaisser le niveau annoncé", () => {
    // Rabaisser « bloquant » en « dégradé » tout en gardant la description
    // d'origine produisait un badge et une phrase contradictoires.
    const display = resolveImpactDisplay("blocking", "incertain");
    expect(display.label).toBe("IMPACT INCERTAIN");
    expect(display.emoji).not.toBe("🔴");
  });

  it("neutralise aussi un impact annoncé nul quand le diagnostic est incertain", () => {
    // Le bandeau vert « AUCUN IMPACT » est une affirmation : il ne doit pas
    // accompagner un diagnostic que le modèle ne garantit pas.
    expect(resolveImpactDisplay("none", "incertain").label).toBe("IMPACT INCERTAIN");
  });

  it("laisse l'affichage d'origine dès que le diagnostic est assumé", () => {
    expect(resolveImpactDisplay("blocking", "certain").label).toBe("UTILISATEUR BLOQUÉ");
    expect(resolveImpactDisplay("none", "probable").label).toBe("AUCUN IMPACT UTILISATEUR");
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

  it("ne réécrit jamais l'impact annoncé par le modèle", () => {
    // L'incertitude est portée par l'AFFICHAGE (resolveImpactDisplay), pas en
    // falsifiant la réponse : sinon le badge contredit sa propre description.
    const parsed = parseAnalysisResult({ ...VALID_RESPONSE, confidence: "incertain" });
    expect(parsed?.userImpact).toEqual(VALID_RESPONSE.userImpact);
  });

  it("accepte les variantes de casse et d'espaces du modèle", () => {
    // Sans normalisation, « Certain » retombait sur le défaut `incertain` et
    // plafonnait TOUTES les alertes, y compris celles déclarées sûres.
    expect(parseAnalysisResult({ ...VALID_RESPONSE, confidence: "Certain" })?.confidence).toBe(
      "certain"
    );
    expect(parseAnalysisResult({ ...VALID_RESPONSE, confidence: " INCERTAIN " })?.confidence).toBe(
      "incertain"
    );
    // Et l'urgence n'est alors PAS plafonnée à tort.
    expect(parseAnalysisResult({ ...VALID_RESPONSE, confidence: "Certain" })?.urgency).toBe("high");
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

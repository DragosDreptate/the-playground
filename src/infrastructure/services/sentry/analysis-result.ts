import {
  type AnalysisResult,
  type Confidence,
  type Urgency,
  type UserImpact,
  type UserImpactLevel,
} from "./analysis-meta";

const URGENCIES: Urgency[] = ["critical", "high", "medium", "low", "noise"];
const USER_IMPACT_LEVELS: UserImpactLevel[] = ["none", "silent", "degraded", "blocking"];
const CONFIDENCES: Confidence[] = ["certain", "probable", "incertain"];

/**
 * Confiance retenue quand le modèle omet le champ ou renvoie une valeur
 * inconnue.
 *
 * TOLÉRANT sur la forme : on garde l'analyse plutôt que de la remplacer par un
 * fallback « Déclencheur non identifié », ce qui détruirait un diagnostic par
 * ailleurs correct.
 *
 * Mais PRUDENT sur le fond : `incertain`, et surtout pas `probable`. Une
 * réponse qui ne se prononce pas ne prouve pas sa propre fiabilité, et
 * `probable` est précisément la valeur qui laisse passer `critical`/`high`
 * intacts — le plafond de D1 se contournerait alors par la simple ABSENCE du
 * champ (modèle qui dérive du schéma, réponse tronquée à `max_tokens`).
 */
const DEFAULT_CONFIDENCE: Confidence = "incertain";

const URGENCY_RANK: Record<Urgency, number> = {
  noise: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/**
 * D1 : une analyse incertaine ne sonne jamais l'alarme haute.
 *
 * L'alerte part quand même, par les deux canaux et avec le même contenu :
 * seuls le bandeau et le libellé changent de ton. Appliqué ICI, côté code,
 * et non en consigne de prompt, pour être déterministe et testable.
 */
export function capUrgencyForConfidence(urgency: Urgency, confidence: Confidence): Urgency {
  if (confidence !== "incertain") return urgency;
  return URGENCY_RANK[urgency] > URGENCY_RANK.medium ? "medium" : urgency;
}

const USER_IMPACT_RANK: Record<UserImpactLevel, number> = {
  none: 0,
  silent: 1,
  degraded: 2,
  blocking: 3,
};

/**
 * Pendant de `capUrgencyForConfidence` sur l'impact utilisateur.
 *
 * Sans lui, une analyse incertaine affichait un en-tête jaune « MOYENNE » et,
 * juste en dessous, le bandeau rouge « UTILISATEUR BLOQUÉ » — contradictoire,
 * et toujours aussi alarmant. Or c'est ce bandeau, plus que l'urgence, qui
 * faisait lire une alerte comme une urgence (cf. THE-PLAYGROUND-2P).
 *
 * Ne remonte jamais un niveau : un impact annoncé nul le reste.
 */
export function capUserImpactForConfidence(
  level: UserImpactLevel,
  confidence: Confidence
): UserImpactLevel {
  if (confidence !== "incertain") return level;
  return USER_IMPACT_RANK[level] > USER_IMPACT_RANK.degraded ? "degraded" : level;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseUserImpact(value: unknown): UserImpact | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!USER_IMPACT_LEVELS.includes(v.level as UserImpactLevel)) return null;
  if (!isNonEmptyString(v.description)) return null;
  return { level: v.level as UserImpactLevel, description: v.description };
}

function parseConfidence(value: unknown): Confidence {
  return CONFIDENCES.includes(value as Confidence) ? (value as Confidence) : DEFAULT_CONFIDENCE;
}

/**
 * Valide la réponse du modèle et renvoie un résultat normalisé, ou `null` si
 * elle est inexploitable (à l'appelant de basculer sur son fallback).
 *
 * L'objet est reconstruit champ par champ : une clé parasite inventée par le
 * modèle ne se propage pas jusqu'à l'email ou Slack.
 */
export function parseAnalysisResult(value: unknown): AnalysisResult | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;

  if (!URGENCIES.includes(v.urgency as Urgency)) return null;
  if (!isNonEmptyString(v.trigger)) return null;
  if (!isNonEmptyString(v.functionalConsequence)) return null;
  if (!isNonEmptyString(v.technical)) return null;

  const userImpact = parseUserImpact(v.userImpact);
  if (!userImpact) return null;

  const confidence = parseConfidence(v.confidence);

  return {
    urgency: capUrgencyForConfidence(v.urgency as Urgency, confidence),
    confidence,
    trigger: v.trigger,
    functionalConsequence: v.functionalConsequence,
    userImpact: {
      ...userImpact,
      level: capUserImpactForConfidence(userImpact.level, confidence),
    },
    technical: v.technical,
  };
}

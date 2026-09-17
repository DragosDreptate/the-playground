import {
  type AnalysisResult,
  type Urgency,
  type UserImpact,
  type UserImpactLevel,
} from "./analysis-meta";

const URGENCIES: Urgency[] = ["critical", "high", "medium", "low", "noise"];
const USER_IMPACT_LEVELS: UserImpactLevel[] = ["none", "silent", "degraded", "blocking"];

/**
 * Les énumérations sont normalisées AVANT comparaison : un modèle écrit
 * « High » ou « high » d'une réponse à l'autre, et rien ne l'en empêche.
 *
 * Sans ça, une simple majuscule fait échouer toute la validation, donc
 * bascule sur le fallback « Déclencheur non identifié » : l'analyse existait,
 * mais l'admin reçoit un message vide à la place.
 */
function normalizedEnum<T extends string>(value: unknown, allowed: T[]): T | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return allowed.includes(normalized as T) ? (normalized as T) : null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseUserImpact(value: unknown): UserImpact | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const level = normalizedEnum(v.level, USER_IMPACT_LEVELS);
  if (!level || !isNonEmptyString(v.description)) return null;
  return { level, description: v.description };
}

/**
 * Valide la réponse du modèle et renvoie un résultat normalisé, ou `null` si
 * elle est inexploitable (à l'appelant de basculer sur son fallback).
 *
 * Ne RÉÉCRIT jamais le verdict : une version antérieure rabaissait l'urgence
 * et l'impact quand le modèle se déclarait peu sûr, et chaque variante de ce
 * mécanisme finissait par mentir quelque part — badge contredisant sa propre
 * description, ou mention d'un plafonnement qui n'avait pas eu lieu. L'objet
 * est seulement reconstruit champ par champ, pour qu'une clé parasite inventée
 * par le modèle ne se propage pas jusqu'à l'email ou Slack.
 */
export function parseAnalysisResult(value: unknown): AnalysisResult | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;

  const urgency = normalizedEnum(v.urgency, URGENCIES);
  if (!urgency) return null;
  if (!isNonEmptyString(v.trigger)) return null;
  if (!isNonEmptyString(v.functionalConsequence)) return null;
  if (!isNonEmptyString(v.technical)) return null;

  const userImpact = parseUserImpact(v.userImpact);
  if (!userImpact) return null;

  return {
    urgency,
    trigger: v.trigger,
    functionalConsequence: v.functionalConsequence,
    userImpact,
    technical: v.technical,
  };
}

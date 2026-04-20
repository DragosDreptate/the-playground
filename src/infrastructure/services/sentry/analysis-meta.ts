export type Urgency = "critical" | "high" | "medium" | "low" | "noise";
export type UserImpactLevel = "none" | "silent" | "degraded" | "blocking";

export type UserImpact = {
  level: UserImpactLevel;
  description: string;
};

export type AnalysisResult = {
  urgency: Urgency;
  trigger: string;
  functionalConsequence: string;
  userImpact: UserImpact;
  technical: string;
};

export const URGENCY_META: Record<Urgency, { label: string; color: string }> = {
  critical: { label: "CRITIQUE", color: "#dc2626" },
  high: { label: "HAUTE", color: "#ea580c" },
  medium: { label: "MOYENNE", color: "#ca8a04" },
  low: { label: "BASSE", color: "#2563eb" },
  noise: { label: "BRUIT", color: "#71717a" },
};

export const USER_IMPACT_META: Record<
  UserImpactLevel,
  { label: string; color: string; emoji: string }
> = {
  none: { label: "AUCUN IMPACT UTILISATEUR", color: "#16a34a", emoji: "🟢" },
  silent: { label: "IMPACT SILENCIEUX", color: "#71717a", emoji: "⚪" },
  degraded: { label: "EXPÉRIENCE DÉGRADÉE", color: "#ea580c", emoji: "🟠" },
  blocking: { label: "UTILISATEUR BLOQUÉ", color: "#dc2626", emoji: "🔴" },
};

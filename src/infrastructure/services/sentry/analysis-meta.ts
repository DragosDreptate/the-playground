export type Urgency = "critical" | "high" | "medium" | "low" | "noise";
export type UserImpactLevel = "none" | "silent" | "degraded" | "blocking";

/**
 * Degré de certitude du diagnostic produit par le modèle.
 *
 * Existe parce que le prompt interdisait de rester vague : privé du droit de
 * s'abstenir, le modèle comblait les trous par de la spéculation, et la
 * spéculation sortait formatée comme un diagnostic (cf. THE-PLAYGROUND-2P,
 * un scan de vulnérabilités annoncé en « UTILISATEUR BLOQUÉ »).
 */
export type Confidence = "certain" | "probable" | "incertain";

export type UserImpact = {
  level: UserImpactLevel;
  description: string;
};

export type AnalysisResult = {
  urgency: Urgency;
  confidence: Confidence;
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

/**
 * Libellés décrivant un ÉTAT, jamais une conséquence.
 *
 * « urgence plafonnée » a été retiré : le plafond ne s'applique pas toujours
 * (rien à rabaisser sous `noise`), et l'annoncer quand même laissait croire
 * qu'on avait masqué quelque chose.
 */
export const CONFIDENCE_META: Record<Confidence, { label: string }> = {
  certain: { label: "Diagnostic sûr" },
  probable: { label: "Diagnostic probable" },
  incertain: { label: "Diagnostic incertain" },
};

export type ImpactDisplay = { label: string; color: string; emoji: string };

export const USER_IMPACT_META: Record<UserImpactLevel, ImpactDisplay> = {
  none: { label: "AUCUN IMPACT UTILISATEUR", color: "#16a34a", emoji: "🟢" },
  silent: { label: "IMPACT SILENCIEUX", color: "#71717a", emoji: "⚪" },
  degraded: { label: "EXPÉRIENCE DÉGRADÉE", color: "#ea580c", emoji: "🟠" },
  blocking: { label: "UTILISATEUR BLOQUÉ", color: "#dc2626", emoji: "🔴" },
};

const UNCERTAIN_IMPACT: ImpactDisplay = {
  label: "IMPACT INCERTAIN",
  color: "#ca8a04",
  emoji: "❓",
};

/**
 * Bandeau d'impact affiché dans l'email et sur Slack.
 *
 * Un diagnostic incertain n'est PAS rabaissé d'un cran : réécrire le niveau
 * tout en gardant la description du modèle produisait un badge et une phrase
 * qui se contredisaient (« EXPÉRIENCE DÉGRADÉE » au-dessus de « l'utilisateur
 * reste bloqué »). On affiche donc l'incertitude pour ce qu'elle est, et la
 * description d'origine reste intacte : le message ne dit jamais plus que ce
 * que le modèle a dit.
 */
export function resolveImpactDisplay(
  level: UserImpactLevel,
  confidence: Confidence
): ImpactDisplay {
  return confidence === "incertain" ? UNCERTAIN_IMPACT : USER_IMPACT_META[level];
}

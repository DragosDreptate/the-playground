import Anthropic from "@anthropic-ai/sdk";

import { gatherUserAuditData } from "./gather-user-audit-data";
import { buildAuditPrompt } from "./build-audit-prompt";
import type { AuditDossier, AuditReport, AuditVerdictLean } from "./types";

// Modèle par défaut Opus (meilleure finesse de jugement ; ~23 ¢/audit, négligeable
// au volume manuel admin). Configurable par env AUDIT_MODEL.
const AUDIT_MODEL = process.env.AUDIT_MODEL ?? "claude-opus-4-8";

const VERDICTS: AuditVerdictLean[] = [
  "likely_legit",
  "ambiguous",
  "likely_spam",
];

/** Parse la réponse JSON du LLM en rapport. Renvoie null si invalide. Testable. */
export function parseAuditReport(
  text: string
): Omit<AuditReport, "found" | "usage"> | null {
  try {
    const raw = text.trim();
    const open = raw.indexOf("{");
    const close = raw.lastIndexOf("}");
    const json = open >= 0 && close > open ? raw.slice(open, close + 1) : raw;
    const p = JSON.parse(json) as Record<string, unknown>;
    if (
      typeof p.identitySummary !== "string" ||
      !VERDICTS.includes(p.verdictLean as AuditVerdictLean)
    ) {
      return null;
    }
    const toStringArray = (x: unknown): string[] =>
      Array.isArray(x) ? x.map((e) => String(e)) : [];
    return {
      identitySummary: p.identitySummary,
      contentSummary: String(p.contentSummary ?? ""),
      behaviorSummary: String(p.behaviorSummary ?? ""),
      signalsFor: toStringArray(p.signalsFor),
      signalsAgainst: toStringArray(p.signalsAgainst),
      verdictLean: p.verdictLean as AuditVerdictLean,
      recommendation: String(p.recommendation ?? ""),
    };
  } catch {
    return null;
  }
}

/** Rapport de repli (déterministe) quand le LLM est indisponible/illisible. */
function fallbackReport(dossier: AuditDossier, note: string): AuditReport {
  const c = dossier.content;
  const hasContent =
    (c?.circlesHosted.length ?? 0) > 0 || (c?.momentsCreated.length ?? 0) > 0;
  const d = dossier.derived;
  const signalsFor: string[] = [];
  if (d?.disposableEmail) signalsFor.push("Email jetable");
  if (d?.localpartLooksRandom) signalsFor.push("Localpart email aléatoire");
  if (d?.nameAllCaps) signalsFor.push("Nom tout en majuscules");
  if (dossier.behavior?.geoipUnstable)
    signalsFor.push("Géoloc instable intra-session (proxy possible)");
  if (d?.blocked) signalsFor.push("Déjà présent dans la blocklist");
  return {
    found: true,
    identitySummary: `${dossier.account?.email ?? dossier.identifier} — ${note}`,
    contentSummary: hasContent
      ? `${c?.circlesHosted.length ?? 0} Communauté(s), ${c?.momentsCreated.length ?? 0} événement(s) créés (voir dossier).`
      : "Aucun contenu créé (compte dormant).",
    behaviorSummary: `${dossier.behavior?.eventCount ?? 0} events PostHog, villes client : ${
      dossier.behavior?.clientCities.join(", ") || "—"
    }`,
    signalsFor,
    signalsAgainst: hasContent ? [] : ["Aucun contenu = rien de répréhensible"],
    verdictLean: "ambiguous",
    recommendation:
      "Analyse LLM indisponible : revue humaine sur le dossier brut. Décision humaine.",
  };
}

/** Audit complet d'un compte : collecte + jugement LLM (mode bouton admin). */
export async function auditUser(identifier: string): Promise<AuditReport> {
  const dossier = await gatherUserAuditData(identifier);

  if (!dossier.found) {
    return {
      found: false,
      identitySummary: `Aucun compte trouvé pour « ${identifier} » (supprimé, ou identifiant inconnu).`,
      contentSummary: "",
      behaviorSummary: "",
      signalsFor: [],
      signalsAgainst: [],
      verdictLean: "ambiguous",
      recommendation:
        "Compte introuvable en base. Si supprimé : le contenu qui trancherait n'existe plus — auditer AVANT de supprimer la prochaine fois.",
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fallbackReport(
      dossier,
      "analyse LLM indisponible (ANTHROPIC_API_KEY manquante)"
    );
  }

  const client = new Anthropic({ apiKey });
  const resp = await client.messages.create({
    model: AUDIT_MODEL,
    max_tokens: 1500,
    messages: [{ role: "user", content: buildAuditPrompt(dossier) }],
  });

  const tb = resp.content.find(
    (b): b is Anthropic.Messages.TextBlock => b.type === "text"
  );
  const parsed = tb ? parseAuditReport(tb.text) : null;
  if (!parsed) {
    return fallbackReport(dossier, "le LLM n'a pas renvoyé un rapport exploitable");
  }

  return {
    found: true,
    ...parsed,
    usage: {
      inputTokens: resp.usage.input_tokens,
      outputTokens: resp.usage.output_tokens,
      model: AUDIT_MODEL,
    },
  };
}

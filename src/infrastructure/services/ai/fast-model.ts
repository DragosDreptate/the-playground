import Anthropic from "@anthropic-ai/sdk";
import type { AiTextCall } from "@/lib/ai-text-call";

/**
 * Modèle rapide partagé par les appels courts et fréquents : radar
 * concurrentiel (mots-clés, extraction Meetup) et analyse des alertes Sentry.
 *
 * Un seul endroit pour l'identifiant ET ses réglages : une montée de version
 * change aussi les paramètres acceptés (Haiku 5.5 réfléchit par défaut, et
 * cette réflexion consomme `max_tokens`), donc les deux bougent ensemble.
 * Décision : spec/decisions.md (2026-10-07, migration Haiku 5.5).
 */
export const FAST_MODEL = {
  model: "claude-haiku-5-5",
  // Sans réflexion, comme Haiku 4.5 : ces tâches sont de l'extraction en JSON,
  // et une réflexion entamerait le budget de tokens prévu pour la réponse.
  params: {
    thinking: { type: "disabled" },
    output_config: { effort: "low" },
  } satisfies Pick<Anthropic.Messages.MessageCreateParamsNonStreaming, "thinking" | "output_config">,
};

/**
 * Renvoie le texte de la réponse, ou `null` si le modèle n'en produit pas.
 * Un refus de sécurité (`stop_reason: "refusal"`, nouveau sur Haiku 5.5) suit
 * le même chemin : chaque appelant a déjà son repli sur `null`.
 */
export function createFastTextCall(client: Anthropic): AiTextCall {
  return async (prompt, maxTokens) => {
    const resp = await client.messages.create({
      model: FAST_MODEL.model,
      max_tokens: maxTokens,
      ...FAST_MODEL.params,
      messages: [{ role: "user", content: prompt }],
    });
    if (resp.stop_reason === "refusal") {
      console.warn(`[fast-model] refus de sécurité de ${FAST_MODEL.model}`);
      return null;
    }
    // Le texte partiel est rendu tel quel (les appelants savent échouer sur
    // un JSON coupé), mais signalé : c'est l'indice d'un plafond trop bas.
    if (resp.stop_reason === "max_tokens") {
      console.warn(`[fast-model] réponse tronquée à ${maxTokens} tokens`);
    }
    const tb = resp.content.find((b): b is Anthropic.Messages.TextBlock => b.type === "text");
    return tb?.text ?? null;
  };
}

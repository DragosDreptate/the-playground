import Anthropic from "@anthropic-ai/sdk";

/**
 * Modèle rapide partagé par les appels courts et fréquents : radar
 * concurrentiel (mots-clés, extraction Meetup) et analyse des alertes Sentry.
 *
 * Un seul endroit pour l'identifiant ET ses réglages : une montée de version
 * change aussi les paramètres acceptés (Haiku 5.5 réfléchit par défaut, et
 * cette réflexion consomme `max_tokens`), donc les deux bougent ensemble.
 * Décision : spec/decisions.md (2026-10-07, migration Haiku 5.5).
 */
export type FastModelConfig = {
  model: string;
  params?: Pick<Anthropic.Messages.MessageCreateParamsNonStreaming, "thinking" | "output_config">;
};

export const FAST_MODEL: FastModelConfig = {
  model: "claude-haiku-5-5",
  // Sans réflexion, comme Haiku 4.5 : ces tâches sont de l'extraction en JSON,
  // et une réflexion entamerait le budget de tokens prévu pour la réponse.
  params: { thinking: { type: "disabled" }, output_config: { effort: "low" } },
};

export type AiTextCall = (prompt: string, maxTokens: number) => Promise<string | null>;

/**
 * Renvoie le texte de la réponse, ou `null` si le modèle n'en produit pas.
 * Un refus de sécurité (`stop_reason: "refusal"`, nouveau sur Haiku 5.5) suit
 * le même chemin : chaque appelant a déjà son repli sur `null`.
 *
 * `onResponse` sert aux evals, qui mesurent usage et troncatures.
 */
export function createFastTextCall(
  client: Anthropic,
  config: FastModelConfig = FAST_MODEL,
  onResponse?: (resp: Anthropic.Messages.Message) => void
): AiTextCall {
  return async (prompt, maxTokens) => {
    const resp = await client.messages.create({
      model: config.model,
      max_tokens: maxTokens,
      ...config.params,
      messages: [{ role: "user", content: prompt }],
    });
    onResponse?.(resp);
    if (resp.stop_reason === "refusal") {
      console.warn(`[fast-model] refus de sécurité de ${config.model}`);
      return null;
    }
    const tb = resp.content.find((b): b is Anthropic.Messages.TextBlock => b.type === "text");
    return tb?.text ?? null;
  };
}

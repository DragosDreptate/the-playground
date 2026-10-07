/**
 * Appel IA texte → texte, injecté dans la logique pure (lib/) pour qu'elle
 * reste testable sans réseau. `null` = pas de réponse exploitable.
 * Implémentation : createFastTextCall (infrastructure/services/ai/fast-model.ts).
 */
export type AiTextCall = (prompt: string, maxTokens: number) => Promise<string | null>;

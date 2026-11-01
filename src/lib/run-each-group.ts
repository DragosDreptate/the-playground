export type EachGroupResult<G> = {
  /** Groupes traités sans erreur. */
  succeeded: G[];
  /** Erreurs des groupes en échec, dans l'ordre. */
  errors: unknown[];
};

/**
 * Pause entre deux lots de langue d'un même envoi : les lots partent l'un après
 * l'autre, la pause évite la rafale d'appels vers le service d'email (même
 * délai que celui appliqué entre les paquets de 100 d'un même lot).
 */
export const LOCALE_GROUP_PAUSE_MS = 500;

/**
 * Traite chaque groupe indépendamment, l'un après l'autre : un groupe en échec
 * n'empêche pas les suivants. Ne lève jamais, renvoie succès et erreurs. Règle
 * unique des envois par lot de langue : à l'appelant de décider quoi faire des
 * erreurs (les signaler, échouer si rien n'est parti).
 *
 * `pauseBetweenMs` : attente entre deux groupes (jamais avant le premier).
 * Locale à cet appel, sans état partagé entre requêtes.
 */
export async function runEachGroup<G>(
  groups: G[],
  run: (group: G) => Promise<void>,
  { pauseBetweenMs = 0 }: { pauseBetweenMs?: number } = {}
): Promise<EachGroupResult<G>> {
  const succeeded: G[] = [];
  const errors: unknown[] = [];
  for (const [index, group] of groups.entries()) {
    if (index > 0 && pauseBetweenMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, pauseBetweenMs));
    }
    try {
      await run(group);
      succeeded.push(group);
    } catch (error) {
      errors.push(error);
    }
  }
  return { succeeded, errors };
}

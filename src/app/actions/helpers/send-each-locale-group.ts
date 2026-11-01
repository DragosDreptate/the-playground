import * as Sentry from "@sentry/nextjs";
import { LOCALE_GROUP_PAUSE_MS, runEachGroup } from "@/lib/run-each-group";

function reportLocaleGroupErrors(errors: unknown[], context: string): void {
  for (const error of errors) {
    Sentry.captureException(error, { tags: { context, locale_group: "true" } });
  }
}

/**
 * Règle unique de traitement des lots de langue en échec :
 * - au moins un lot est parti → toutes les erreurs partent dans Sentry ;
 * - rien n'est parti → les erreurs suivantes partent dans Sentry et la première
 *   remonte à l'appelant (comme avant le découpage, quand il n'y avait qu'un lot).
 */
export function handleLocaleGroupFailures(
  errors: unknown[],
  nothingSent: boolean,
  context: string
): void {
  if (errors.length === 0) return;
  if (nothingSent) {
    reportLocaleGroupErrors(errors.slice(1), context);
    throw errors[0];
  }
  reportLocaleGroupErrors(errors, context);
}

/** Envoie chaque lot de langue indépendamment (voir `runEachGroup`), espacés de 500 ms. */
export async function sendEachLocaleGroup<G>(
  groups: G[],
  send: (group: G) => Promise<void>,
  context: string
): Promise<void> {
  const { succeeded, errors } = await runEachGroup(groups, send, {
    pauseBetweenMs: LOCALE_GROUP_PAUSE_MS,
  });
  handleLocaleGroupFailures(errors, succeeded.length === 0, context);
}

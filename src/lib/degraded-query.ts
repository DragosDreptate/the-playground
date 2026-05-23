import * as Sentry from "@sentry/nextjs";

// Pour les blocs décoratifs d'une page (compteurs, avatars, listes
// secondaires) : si la query échoue, on rend la page en mode dégradé avec
// un fallback plutôt que de tout perdre. L'erreur reste capturée par
// Sentry pour le monitoring. À réserver aux blocs non structurants.
export async function degradedQuery<T>(
  promise: Promise<T>,
  fallback: T,
  tag: string,
): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { context: "degraded_query", query: tag },
    });
    return fallback;
  }
}

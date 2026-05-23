import { unstable_noStore as noStore } from "next/cache";
import * as Sentry from "@sentry/nextjs";

// Pour les blocs décoratifs d'une page (compteurs, avatars, listes
// secondaires) : si la query échoue, on rend la page en mode dégradé avec
// un fallback plutôt que de tout perdre. L'erreur reste capturée par
// Sentry pour le monitoring. À réserver aux blocs non structurants.
//
// Quand on dégrade, on opt-out du cache ISR pour cette regen : sinon le
// HTML dégradé (compteurs à 0, avatars vides) serait servi à tous les
// visiteurs pendant la durée du `revalidate`, transformant un hoquet de
// quelques secondes en page morte pendant une minute.
export async function degradedQuery<T>(
  promise: Promise<T>,
  fallback: T,
  tag: string,
): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    noStore();
    Sentry.captureException(err, {
      tags: { context: "degraded_query", query: tag },
    });
    return fallback;
  }
}

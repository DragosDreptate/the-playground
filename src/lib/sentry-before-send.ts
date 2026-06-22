import type { ErrorEvent } from "@sentry/nextjs";

import { isExpectedAuthRejectionMessage } from "@/lib/auth/error-kinds";

/** Tag posé par NOS captures d'auth délibérées (logger auth + page /auth/error). */
const DELIBERATE_AUTH_CONTEXT = "auth";

/**
 * `beforeSend` Sentry partagé (server + edge).
 *
 * Objectif unique : supprimer le DOUBLON error-level que le SDK auto-capte
 * quand `@auth/core` lève un rejet d'authentification ATTENDU (AccessDenied via
 * blocklist, Verification d'un token expiré…) sur une route `/api/auth/*`. Avec
 * la blocklist active, ces refus généraient de fausses alertes high-priority.
 *
 * On ne touche JAMAIS à l'observabilité voulue : nos captures délibérées
 * (`logger.error` d'auth.config + `captureMessage` de /auth/error) portent le
 * tag `context: "auth"` et sont en niveau warning. Elles passent telles quelles
 * — ce sont elles qui gardent la trace (user-agent, code) et le signal d'abus
 * (pic de Verification falsifiés). Seule l'exception SANS ce tag (l'auto-capture
 * brute du SDK) est dropée.
 *
 * Détection par le message `@auth/core` (`errors.authjs.dev#<code>`) faute de
 * code structuré sur l'auto-capture. Mode d'échec volontairement sûr : si un
 * futur `@auth/core` reformule ses messages, le filtre cesse de matcher et ces
 * erreurs RÉAPPARAISSENT (bruit), au lieu de masquer silencieusement de vraies
 * erreurs.
 */
export function dropExpectedAuthRejections(
  event: ErrorEvent
): ErrorEvent | null {
  // Capture délibérée (taggée context=auth) → toujours conservée.
  if (event.tags?.context === DELIBERATE_AUTH_CONTEXT) return event;

  const values = event.exception?.values;
  if (values?.some((value) => isExpectedAuthRejectionMessage(value.value))) {
    return null;
  }
  return event;
}

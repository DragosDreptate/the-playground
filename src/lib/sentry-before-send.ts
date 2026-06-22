import type { ErrorEvent } from "@sentry/nextjs";

import { isExpectedAuthRejectionMessage } from "@/lib/auth/error-kinds";

/**
 * `beforeSend` Sentry partagé (server + edge).
 *
 * Drope l'exception error-level que le SDK capte automatiquement quand
 * `@auth/core` lève un rejet d'authentification ATTENDU (AccessDenied via
 * blocklist, token expiré…) sur une route `/api/auth/*`. Ces refus restent
 * observés via le `captureMessage` warning de `/auth/error` : on retire le
 * doublon error-level (fausses alertes), pas l'observabilité.
 */
export function dropExpectedAuthRejections(
  event: ErrorEvent
): ErrorEvent | null {
  const values = event.exception?.values;
  if (values?.some((value) => isExpectedAuthRejectionMessage(value.value))) {
    return null;
  }
  return event;
}

import type { ErrorEvent } from "@sentry/nextjs";

import {
  authErrorCodeFromMessage,
  isExpectedAuthRejectionMessage,
} from "@/lib/auth/error-kinds";

/** Tag posé par NOS captures d'auth délibérées (logger auth + page /auth/error). */
const DELIBERATE_AUTH_CONTEXT = "auth";

/**
 * `beforeSend` Sentry partagé (server + edge).
 *
 * Supprime les DOUBLONS d'exception auto-captés quand `@auth/core` lève un rejet
 * d'authentification ATTENDU sur une route `/api/auth/*`. Sans ça, ces refus
 * généraient de fausses alertes high-priority.
 *
 * Deux cas dropés :
 *  1. Toute exception **AccessDenied** (auto-capture brute du SDK OU re-capture
 *     du hook `logger.error`), car un AccessDenied ne vient QUE d'un `return
 *     false` du callback signIn (blocklist / domaine jetable) — désormais capté
 *     délibérément AVEC identité par `reportRejectedSignIn`. L'exception anonyme
 *     est donc un pur doublon, qu'elle porte ou non le tag `context: auth`.
 *  2. Les autres rejets attendus auto-captés par le SDK (ex. Verification d'un
 *     token expiré) SANS tag délibéré.
 *
 * On ne touche JAMAIS à l'observabilité voulue : nos captures délibérées
 * (`captureMessage` de rejet et de /auth/error, Verification taggée context=auth)
 * sont conservées — ce sont elles qui gardent l'identité, la trace et le signal
 * d'abus (pic de Verification falsifiés).
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
  const values = event.exception?.values;

  // (1) Exception AccessDenied (SDK ou logger.error) → doublon du captureMessage
  // délibéré de rejet. Dropée quel que soit le tag.
  if (
    values?.some((v) => authErrorCodeFromMessage(v.value) === "AccessDenied")
  ) {
    return null;
  }

  // (2) Capture délibérée (taggée context=auth) → conservée : captureMessage de
  // rejet/erreur-page et Verification context=auth (signal d'abus).
  if (event.tags?.context === DELIBERATE_AUTH_CONTEXT) return event;

  // (3) Autre rejet attendu auto-capté par le SDK (Verification sans tag) → doublon.
  if (values?.some((value) => isExpectedAuthRejectionMessage(value.value))) {
    return null;
  }
  return event;
}

import posthog from "posthog-js";

/**
 * Capture un event d'intention au clic d'un CTA pré-auth (« S'inscrire » sur un
 * événement, « Rejoindre » sur une Communauté). Permet de distinguer le
 * désintérêt (pas de clic) de l'abandon lié à l'authentification (#610).
 *
 * Non connecté, le clic navigue immédiatement vers /auth/sign-in : sendBeacon
 * garantit que l'event survit à la navigation.
 */
export function captureIntentEvent(
  event: string,
  properties: Record<string, string>,
  authenticated: boolean
): void {
  posthog.capture(
    event,
    { ...properties, authenticated },
    authenticated ? undefined : { transport: "sendBeacon" }
  );
}

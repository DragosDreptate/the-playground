/**
 * PostHog server-side capture — pour les événements déclenchés côté serveur
 * (Auth.js callbacks, server actions critiques).
 * Non-bloquant : une erreur ici ne doit jamais interrompre le flux utilisateur.
 */

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = "https://eu.posthog.com";

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  if (!POSTHOG_KEY || process.env.NODE_ENV !== "production") return;

  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        distinct_id: distinctId,
        properties: {
          $lib: "posthog-server",
          ...properties,
        },
      }),
    });
  } catch {
    // Non-bloquant — analytics ne doit jamais casser l'app
  }
}

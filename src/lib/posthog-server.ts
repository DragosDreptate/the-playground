/**
 * PostHog server-side capture — pour les événements déclenchés côté serveur
 * (Auth.js callbacks, server actions critiques).
 * Non-bloquant : une erreur ici ne doit jamais interrompre le flux utilisateur.
 */

import { cookies } from "next/headers";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = "https://eu.posthog.com";

/**
 * Récupère le `distinct_id` du navigateur depuis le cookie PostHog
 * (`ph_<key>_posthog`), pour rattacher un event serveur à la même person et au
 * même parcours que les events client ($pageview, etc.). Indispensable pour
 * corréler une détection serveur (ex. `bot_detected`) avec la navigation qui
 * l'a précédée, sans jointure manuelle.
 *
 * Renvoie `null` si le cookie est absent (navigateur neuf, PostHog bloqué) ou
 * illisible — l'appelant retombe alors sur un identifiant de repli.
 */
export async function getPosthogDistinctId(): Promise<string | null> {
  if (!POSTHOG_KEY) return null;
  try {
    const raw = (await cookies()).get(`ph_${POSTHOG_KEY}_posthog`)?.value;
    if (!raw) return null;
    // La valeur est un JSON, parfois URL-encodé selon le navigateur.
    const json = raw.startsWith("{") ? raw : decodeURIComponent(raw);
    const parsed = JSON.parse(json) as { distinct_id?: string };
    return parsed.distinct_id ?? null;
  } catch {
    return null;
  }
}

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

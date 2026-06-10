import { headers } from "next/headers";

/**
 * Contexte requête pour l'observabilité auth (Sentry, PostHog) : user-agent
 * et referer permettent de distinguer un clic humain d'une détonation de
 * scanner email (incident @interieur.gouv.fr). Ne jette jamais : hors scope
 * requête, retourne "unknown" pour ne pas faire perdre la capture appelante.
 */
export async function getRequestObservability(): Promise<{
  user_agent: string;
  referer: string;
}> {
  try {
    const headersList = await headers();
    return {
      user_agent: headersList.get("user-agent") ?? "unknown",
      referer: headersList.get("referer") ?? "unknown",
    };
  } catch {
    return { user_agent: "unknown", referer: "unknown" };
  }
}

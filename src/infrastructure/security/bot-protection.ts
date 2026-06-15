import * as Sentry from "@sentry/nextjs";
import { checkBotId } from "botid/server";
import { after } from "next/server";
import { getLocale } from "next-intl/server";
import { getRequestObservability } from "@/lib/auth/request-observability";
import { captureServerEvent, getPosthogDistinctId } from "@/lib/posthog-server";

/**
 * Vérifie, via Vercel BotID, si la requête en cours est classée comme bot.
 *
 * À appeler au début d'une server action / route handler dont le path est
 * déclaré dans `initBotId({ protect: [...] })` (src/instrumentation-client.ts).
 * Sans cette déclaration côté client, `checkBotId()` échoue.
 *
 * Comportement volontaire :
 * - **Fail-open** : toute erreur (panne BotID, classification indisponible) renvoie
 *   `false`. On ne bloque jamais un humain à cause d'une indisponibilité du service.
 *   Les autres garde-fous (blocklist sign-in, domaines jetables) restent actifs.
 *   L'erreur est remontée à Sentry pour qu'une panne durable (qui neutraliserait
 *   la protection en silence) reste observable.
 * - En local, BotID renvoie toujours `isBot: false` (cf. doc « local development
 *   behavior »), donc le développement et les tests E2E ne sont pas impactés.
 */
export async function isLikelyBot(): Promise<boolean> {
  try {
    const { isBot } = await checkBotId();
    return isBot;
  } catch (error) {
    Sentry.captureException(error);
    return false;
  }
}

/** Provider de connexion à l'origine du blocage BotID. */
export type BotBlockProvider = "google" | "github" | "resend";

/**
 * Journalise un blocage BotID dans PostHog (event `bot_blocked`).
 *
 * Objectif : mesurer le taux de blocage et distinguer un faux positif récurrent
 * (ex. profil Firefox/Linux mal classé) d'une vraie attaque, sans avoir à
 * corréler à la main les navigations `?error=BotDetected` dans PostHog.
 *
 * - Le contexte (user-agent, referer, locale, `distinct_id` navigateur) est lu
 *   **dans le request context**, avant `after()`, pour rester fiable.
 * - L'envoi réseau est détaché via `after()` : il ne bloque pas la réponse et
 *   survit au `redirect()` qui suit côté OAuth. C'est ce qui évite le bug
 *   fire-and-forget connu (events serveur perdus par intermittence sur Vercel).
 * - Le `distinct_id` du cookie PostHog rattache l'event au parcours client
 *   (la page communauté visitée avant la tentative), rendant l'alerte
 *   directement actionnable.
 */
export async function recordBotBlock(input: {
  provider: BotBlockProvider;
  email?: string;
}): Promise<void> {
  const [{ user_agent, referer }, locale, distinctId] = await Promise.all([
    getRequestObservability(),
    getLocale(),
    getPosthogDistinctId(),
  ]);

  const properties = {
    provider: input.provider,
    locale,
    user_agent,
    referer,
    ...(input.email
      ? { email_domain: input.email.split("@")[1] ?? "unknown" }
      : {}),
  };

  after(() =>
    captureServerEvent(
      distinctId ?? input.email ?? "anonymous_bot",
      "bot_blocked",
      properties
    )
  );
}

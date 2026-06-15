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

/** Provider de connexion à l'origine de la détection BotID. */
export type BotBlockProvider = "google" | "github" | "resend";

/**
 * Mode d'application de BotID au sign-in, piloté par la variable d'environnement
 * `BOTID_MODE` (modifiable dans Vercel, prise en compte au prochain déploiement) :
 *
 * - `enforce` (défaut) : détecte, journalise **et bloque** le bot.
 * - `observe` : détecte et journalise, mais **laisse passer** — sert à mesurer le
 *   taux de faux positifs en prod sans pénaliser de vrais utilisateurs.
 * - `off` : kill switch — ne vérifie même pas (aucun appel BotID, aucun event).
 *
 * Toute valeur absente ou invalide retombe sur `enforce` (sécurité par défaut).
 */
export type BotIdMode = "enforce" | "observe" | "off";

export function getBotIdMode(): BotIdMode {
  const mode = process.env.BOTID_MODE;
  return mode === "observe" || mode === "off" ? mode : "enforce";
}

/**
 * Évalue une tentative de sign-in vis-à-vis de BotID, en respectant `BOTID_MODE`.
 *
 * Retourne `shouldBlock` : l'appelant bloque (redirect OAuth / état d'erreur
 * email) seulement si vrai. Toute détection (modes `enforce` et `observe`) est
 * journalisée via `recordBotDetection`. En mode `off`, aucun appel BotID n'est
 * fait et rien n'est journalisé.
 */
export async function evaluateBotSignIn(input: {
  provider: BotBlockProvider;
  email?: string;
}): Promise<{ shouldBlock: boolean }> {
  const mode = getBotIdMode();
  if (mode === "off") return { shouldBlock: false };

  if (!(await isLikelyBot())) return { shouldBlock: false };

  await recordBotDetection({ ...input, mode });
  return { shouldBlock: mode === "enforce" };
}

/**
 * Journalise une détection BotID dans PostHog (event `bot_detected`).
 *
 * Objectif : mesurer le taux de détection et distinguer un faux positif récurrent
 * (ex. profil Firefox/Linux mal classé) d'une vraie attaque, sans avoir à
 * corréler à la main les navigations `?error=BotDetected` dans PostHog. La
 * propriété `blocked` distingue un vrai blocage (`enforce`) d'une simple
 * observation (`observe`).
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
async function recordBotDetection(input: {
  provider: BotBlockProvider;
  email?: string;
  mode: Exclude<BotIdMode, "off">;
}): Promise<void> {
  // Télémétrie best-effort : ne doit JAMAIS faire échouer le sign-in. La collecte
  // de contexte (notamment getLocale, non protégé en interne contrairement à
  // getRequestObservability/getPosthogDistinctId) est donc entièrement gardée.
  try {
    const [{ user_agent, referer }, locale, distinctId] = await Promise.all([
      getRequestObservability(),
      getLocale(),
      getPosthogDistinctId(),
    ]);

    const properties = {
      provider: input.provider,
      mode: input.mode,
      blocked: input.mode === "enforce",
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
        "bot_detected",
        properties
      )
    );
  } catch (error) {
    Sentry.captureException(error);
  }
}

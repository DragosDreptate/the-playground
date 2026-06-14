import { checkBotId } from "botid/server";

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
 * - En local, BotID renvoie toujours `isBot: false` (cf. doc « local development
 *   behavior »), donc le développement et les tests E2E ne sont pas impactés.
 */
export async function isLikelyBot(): Promise<boolean> {
  try {
    const { isBot } = await checkBotId();
    return isBot;
  } catch {
    return false;
  }
}

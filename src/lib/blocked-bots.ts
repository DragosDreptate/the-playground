/**
 * Aggressive SEO/scraping crawlers that ignore rate limits and robots.txt.
 * Blocked site-wide (Edge middleware returns 403, robots.txt disallows /).
 * All entries are lowercase for case-insensitive matching in middleware.
 */
export const AGGRESSIVE_CRAWLERS = [
  "ahrefsbot",
  "semrushbot",
  "dotbot",
  "mj12bot",
  "blexbot",
  "dataforseo",
  "zoominfobot",
  "petalbot",
];

/**
 * AI training crawlers. Allowed on generic platform pages (homepage, /explorer,
 * /about, blog, etc.) but blocked on user-generated content — Moments (/m/) and
 * Circles (/circles/) — which belongs to Hosts and their communities, not to
 * The Playground.
 */
export const AI_TRAINING_BOTS = [
  "gptbot",
  "claudebot",
  "ccbot",
  "bytespider",
  "google-extended",
  "applebot-extended",
  "meta-externalagent",
  "perplexitybot",
  "amazonbot",
];

/**
 * Robots refusés sur le contenu des Communautés servi hors middleware (routes
 * `/api/*`, que le matcher du middleware exclut) : crawlers agressifs et
 * robots d'entraînement d'IA, comme sur `/m/` et `/circles/`.
 */
export function isBotBlockedOnUgc(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const lower = userAgent.toLowerCase();
  return [...AGGRESSIVE_CRAWLERS, ...AI_TRAINING_BOTS].some((bot) =>
    lower.includes(bot)
  );
}

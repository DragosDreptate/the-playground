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

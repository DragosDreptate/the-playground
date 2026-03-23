/**
 * Known aggressive crawlers that ignore rate limits and robots.txt.
 * Shared between Edge middleware (403 enforcement) and robots.ts (polite request).
 * All entries are lowercase for case-insensitive matching in middleware.
 */
export const BLOCKED_BOTS = [
  "ahrefsbot",
  "semrushbot",
  "dotbot",
  "mj12bot",
  "blexbot",
  "dataforseo",
  "bytespider",
  "gptbot",
  "claudebot",
  "ccbot",
  "zoominfobot",
  "petalbot",
];

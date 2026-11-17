import { describe, it, expect } from "vitest";
import { isBotBlockedOnUgc } from "../blocked-bots";

describe("isBotBlockedOnUgc", () => {
  it.each([
    ["an AI training bot", "Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)", true],
    ["an aggressive crawler", "Mozilla/5.0 (compatible; AhrefsBot/7.0)", true],
    ["Google Calendar", "Google-Calendar-Importer", false],
    ["Apple Calendar", "macOS/15.1 (24B83) dataaccessd/1.0", false],
    ["a browser", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", false],
    ["a missing user agent", null, false],
  ])("should decide for %s", (_label, userAgent, blocked) => {
    expect(isBotBlockedOnUgc(userAgent)).toBe(blocked);
  });
});

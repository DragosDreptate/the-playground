import { beforeEach, describe, expect, it, vi } from "vitest";

const checkBotId = vi.fn();
vi.mock("botid/server", () => ({
  checkBotId: () => checkBotId(),
}));

import { isLikelyBot } from "../bot-protection";

describe("isLikelyBot (wrapper Vercel BotID)", () => {
  beforeEach(() => {
    checkBotId.mockReset();
  });

  describe("given BotID classe la session comme un bot", () => {
    it("should return true", async () => {
      checkBotId.mockResolvedValue({ isBot: true });
      await expect(isLikelyBot()).resolves.toBe(true);
    });
  });

  describe("given BotID classe la session comme un humain", () => {
    it("should return false", async () => {
      checkBotId.mockResolvedValue({ isBot: false });
      await expect(isLikelyBot()).resolves.toBe(false);
    });
  });

  describe("given BotID est indisponible (panne)", () => {
    it("should fail-open et renvoyer false pour ne pas bloquer un humain", async () => {
      checkBotId.mockRejectedValue(new Error("BotID outage"));
      await expect(isLikelyBot()).resolves.toBe(false);
    });
  });
});

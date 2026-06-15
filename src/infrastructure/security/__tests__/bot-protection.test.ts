import { beforeEach, describe, expect, it, vi } from "vitest";

const checkBotId = vi.fn();
vi.mock("botid/server", () => ({
  checkBotId: () => checkBotId(),
}));

const captureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: (error: unknown) => captureException(error),
}));

// `after()` exécute son callback immédiatement dans les tests pour observer
// l'envoi de l'event sans dépendre du lifecycle de requête Next.js.
const after = vi.fn((cb: () => unknown) => cb());
vi.mock("next/server", () => ({
  after: (cb: () => unknown) => after(cb),
}));

const getLocale = vi.fn();
vi.mock("next-intl/server", () => ({
  getLocale: () => getLocale(),
}));

const getRequestObservability = vi.fn();
vi.mock("@/lib/auth/request-observability", () => ({
  getRequestObservability: () => getRequestObservability(),
}));

const captureServerEvent = vi.fn();
const getPosthogDistinctId = vi.fn();
vi.mock("@/lib/posthog-server", () => ({
  captureServerEvent: (...args: unknown[]) => captureServerEvent(...args),
  getPosthogDistinctId: () => getPosthogDistinctId(),
}));

import { isLikelyBot, recordBotBlock } from "../bot-protection";

describe("isLikelyBot (wrapper Vercel BotID)", () => {
  beforeEach(() => {
    checkBotId.mockReset();
    captureException.mockReset();
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

    it("should remonter l'erreur à Sentry pour rendre la panne observable", async () => {
      const outage = new Error("BotID outage");
      checkBotId.mockRejectedValue(outage);
      await isLikelyBot();
      expect(captureException).toHaveBeenCalledWith(outage);
    });
  });
});

describe("recordBotBlock (journalisation des blocages BotID)", () => {
  beforeEach(() => {
    after.mockClear();
    captureServerEvent.mockReset();
    getLocale.mockReset();
    getRequestObservability.mockReset();
    getPosthogDistinctId.mockReset();
    getLocale.mockResolvedValue("fr");
    getRequestObservability.mockResolvedValue({
      user_agent: "Mozilla/5.0 (X11; Linux) Firefox/126",
      referer: "https://the-playground.fr/en/circles/tech-speak-her",
    });
    getPosthogDistinctId.mockResolvedValue("ph-distinct-123");
  });

  describe("given un blocage OAuth (Google)", () => {
    it("should émettre un event bot_blocked avec le contexte de requête", async () => {
      await recordBotBlock({ provider: "google" });

      expect(captureServerEvent).toHaveBeenCalledWith(
        "ph-distinct-123",
        "bot_blocked",
        {
          provider: "google",
          locale: "fr",
          user_agent: "Mozilla/5.0 (X11; Linux) Firefox/126",
          referer: "https://the-playground.fr/en/circles/tech-speak-her",
        }
      );
    });

    it("should détacher l'envoi via after() pour survivre au redirect", async () => {
      await recordBotBlock({ provider: "google" });
      expect(after).toHaveBeenCalledTimes(1);
    });
  });

  describe("given un blocage magic link avec email", () => {
    it("should ajouter le email_domain sans exposer l'adresse complète", async () => {
      await recordBotBlock({ provider: "resend", email: "spammer@ibymail.com" });

      expect(captureServerEvent).toHaveBeenCalledWith(
        "ph-distinct-123",
        "bot_blocked",
        expect.objectContaining({ provider: "resend", email_domain: "ibymail.com" })
      );
    });
  });

  describe("given le cookie PostHog est absent (navigateur neuf / PostHog bloqué)", () => {
    it("should retomber sur l'email comme distinct_id si disponible", async () => {
      getPosthogDistinctId.mockResolvedValue(null);
      await recordBotBlock({ provider: "resend", email: "spammer@ibymail.com" });

      expect(captureServerEvent).toHaveBeenCalledWith(
        "spammer@ibymail.com",
        "bot_blocked",
        expect.any(Object)
      );
    });

    it("should retomber sur 'anonymous_bot' quand ni cookie ni email", async () => {
      getPosthogDistinctId.mockResolvedValue(null);
      await recordBotBlock({ provider: "github" });

      expect(captureServerEvent).toHaveBeenCalledWith(
        "anonymous_bot",
        "bot_blocked",
        expect.any(Object)
      );
    });
  });
});

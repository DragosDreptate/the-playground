import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { evaluateBotSignIn, getBotIdMode, isLikelyBot } from "../bot-protection";

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

describe("getBotIdMode (lecture de BOTID_MODE)", () => {
  const ORIGINAL = process.env.BOTID_MODE;
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.BOTID_MODE;
    else process.env.BOTID_MODE = ORIGINAL;
  });

  it.each([
    ["observe", "observe"],
    ["off", "off"],
    ["enforce", "enforce"],
  ] as const)("should mapper %s -> %s", (raw, expected) => {
    process.env.BOTID_MODE = raw;
    expect(getBotIdMode()).toBe(expected);
  });

  it("should retomber sur enforce si la variable est absente", () => {
    delete process.env.BOTID_MODE;
    expect(getBotIdMode()).toBe("enforce");
  });

  it("should retomber sur enforce si la valeur est invalide", () => {
    process.env.BOTID_MODE = "yolo";
    expect(getBotIdMode()).toBe("enforce");
  });
});

describe("evaluateBotSignIn (modes BotID + journalisation)", () => {
  const ORIGINAL_MODE = process.env.BOTID_MODE;

  beforeEach(() => {
    after.mockClear();
    checkBotId.mockReset();
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

  afterEach(() => {
    if (ORIGINAL_MODE === undefined) delete process.env.BOTID_MODE;
    else process.env.BOTID_MODE = ORIGINAL_MODE;
  });

  describe("given mode enforce et un bot détecté", () => {
    beforeEach(() => {
      process.env.BOTID_MODE = "enforce";
      checkBotId.mockResolvedValue({ isBot: true });
    });

    it("should demander le blocage", async () => {
      await expect(evaluateBotSignIn({ provider: "google" })).resolves.toEqual({
        shouldBlock: true,
      });
    });

    it("should émettre bot_detected avec blocked=true et le contexte de requête", async () => {
      await evaluateBotSignIn({ provider: "google" });

      expect(captureServerEvent).toHaveBeenCalledWith(
        "ph-distinct-123",
        "bot_detected",
        {
          provider: "google",
          mode: "enforce",
          blocked: true,
          locale: "fr",
          user_agent: "Mozilla/5.0 (X11; Linux) Firefox/126",
          referer: "https://the-playground.fr/en/circles/tech-speak-her",
        }
      );
    });

    it("should détacher l'envoi via after() pour survivre au redirect", async () => {
      await evaluateBotSignIn({ provider: "google" });
      expect(after).toHaveBeenCalledTimes(1);
    });

    it("should ajouter le email_domain pour le flux magic link sans exposer l'adresse", async () => {
      await evaluateBotSignIn({ provider: "resend", email: "spammer@ibymail.com" });

      expect(captureServerEvent).toHaveBeenCalledWith(
        "ph-distinct-123",
        "bot_detected",
        expect.objectContaining({ provider: "resend", email_domain: "ibymail.com" })
      );
    });
  });

  describe("given mode observe et un bot détecté", () => {
    beforeEach(() => {
      process.env.BOTID_MODE = "observe";
      checkBotId.mockResolvedValue({ isBot: true });
    });

    it("should journaliser mais NE PAS bloquer (mesure des faux positifs)", async () => {
      const result = await evaluateBotSignIn({ provider: "google" });

      expect(result).toEqual({ shouldBlock: false });
      expect(captureServerEvent).toHaveBeenCalledWith(
        "ph-distinct-123",
        "bot_detected",
        expect.objectContaining({ mode: "observe", blocked: false })
      );
    });
  });

  describe("given mode off", () => {
    beforeEach(() => {
      process.env.BOTID_MODE = "off";
      checkBotId.mockResolvedValue({ isBot: true });
    });

    it("should ne jamais appeler BotID ni journaliser (kill switch)", async () => {
      const result = await evaluateBotSignIn({ provider: "google" });

      expect(result).toEqual({ shouldBlock: false });
      expect(checkBotId).not.toHaveBeenCalled();
      expect(captureServerEvent).not.toHaveBeenCalled();
    });
  });

  describe("given une session humaine (non-bot) en mode enforce", () => {
    beforeEach(() => {
      process.env.BOTID_MODE = "enforce";
      checkBotId.mockResolvedValue({ isBot: false });
    });

    it("should laisser passer sans journaliser", async () => {
      const result = await evaluateBotSignIn({ provider: "google" });

      expect(result).toEqual({ shouldBlock: false });
      expect(captureServerEvent).not.toHaveBeenCalled();
    });
  });

  describe("given le cookie PostHog est absent (navigateur neuf / PostHog bloqué)", () => {
    beforeEach(() => {
      process.env.BOTID_MODE = "enforce";
      checkBotId.mockResolvedValue({ isBot: true });
      getPosthogDistinctId.mockResolvedValue(null);
    });

    it("should retomber sur l'email comme distinct_id si disponible", async () => {
      await evaluateBotSignIn({ provider: "resend", email: "spammer@ibymail.com" });

      expect(captureServerEvent).toHaveBeenCalledWith(
        "spammer@ibymail.com",
        "bot_detected",
        expect.any(Object)
      );
    });

    it("should retomber sur 'anonymous_bot' quand ni cookie ni email", async () => {
      await evaluateBotSignIn({ provider: "github" });

      expect(captureServerEvent).toHaveBeenCalledWith(
        "anonymous_bot",
        "bot_detected",
        expect.any(Object)
      );
    });
  });
});

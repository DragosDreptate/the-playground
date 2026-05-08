import { describe, it, expect, vi, beforeEach } from "vitest";

const getLocaleMock = vi.fn();
const getTranslationsMock = vi.fn();

vi.mock("next-intl/server", () => ({
  getLocale: () => getLocaleMock(),
  getTranslations: (opts: unknown) => getTranslationsMock(opts),
}));

import {
  buildEmailLocaleResolver,
  DEFAULT_RECIPIENT_LOCALE,
} from "../email-locale";

describe("buildEmailLocaleResolver", () => {
  beforeEach(() => {
    getLocaleMock.mockReset();
    getTranslationsMock.mockReset();
    getTranslationsMock.mockImplementation(({ locale }: { locale: string }) =>
      Promise.resolve(((key: string) => `[${locale}]${key}`) as unknown),
    );
  });

  describe("given a Player triggers from /en (locale 'en')", () => {
    it("resolves the trigger to 'en' and any other recipient to FR", async () => {
      getLocaleMock.mockResolvedValue("en");

      const resolver = await buildEmailLocaleResolver("trigger-user");

      expect(resolver.resolveFor("trigger-user")).toBe("en");
      expect(resolver.resolveFor("host-user")).toBe(DEFAULT_RECIPIENT_LOCALE);
      expect(resolver.resolveFor(null)).toBe(DEFAULT_RECIPIENT_LOCALE);
      expect(resolver.resolveFor(undefined)).toBe(DEFAULT_RECIPIENT_LOCALE);
    });

    it("loads translations only once per locale (cache)", async () => {
      getLocaleMock.mockResolvedValue("en");
      const resolver = await buildEmailLocaleResolver("trigger-user");

      await resolver.translationsFor("trigger-user");
      await resolver.translationsFor("trigger-user");
      await resolver.translationsFor("host-1");
      await resolver.translationsFor("host-2");

      // 2 locales distinctes (en + fr) → 2 appels seulement
      expect(getTranslationsMock).toHaveBeenCalledTimes(2);
      expect(getTranslationsMock).toHaveBeenCalledWith({
        locale: "en",
        namespace: "Email",
      });
      expect(getTranslationsMock).toHaveBeenCalledWith({
        locale: DEFAULT_RECIPIENT_LOCALE,
        namespace: "Email",
      });
    });
  });

  describe("given a Host triggers from /fr (locale 'fr')", () => {
    it("falls back all recipients to FR (trigger + others)", async () => {
      getLocaleMock.mockResolvedValue("fr");

      const resolver = await buildEmailLocaleResolver("host-user");

      expect(resolver.resolveFor("host-user")).toBe("fr");
      expect(resolver.resolveFor("player-en")).toBe(DEFAULT_RECIPIENT_LOCALE);
    });
  });

  describe("given no trigger user (null)", () => {
    it("treats every recipient as 'tier' → default locale", async () => {
      getLocaleMock.mockResolvedValue("en");

      const resolver = await buildEmailLocaleResolver(null);

      expect(resolver.resolveFor("any-user")).toBe(DEFAULT_RECIPIENT_LOCALE);
      expect(resolver.resolveFor(null)).toBe(DEFAULT_RECIPIENT_LOCALE);
    });
  });

  describe("given a Host triggers from /en and approves another user", () => {
    it("returns 'en' for the host (trigger) and FR for the approved member", async () => {
      getLocaleMock.mockResolvedValue("en");

      const resolver = await buildEmailLocaleResolver("host-user");

      expect(resolver.resolveFor("host-user")).toBe("en");
      expect(resolver.resolveFor("approved-member")).toBe(
        DEFAULT_RECIPIENT_LOCALE,
      );
    });
  });
});

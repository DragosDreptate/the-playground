import { describe, it, expect, vi, beforeEach } from "vitest";

const getLocaleMock = vi.fn();
const getTranslationsMock = vi.fn();

vi.mock("next-intl/server", () => ({
  getLocale: () => getLocaleMock(),
  getTranslations: (opts: unknown) => getTranslationsMock(opts),
}));

import {
  createEmailLocaleResolver,
  DEFAULT_RECIPIENT_LOCALE,
  toRecipientLocale,
  type RecipientLocaleLoader,
} from "../email-locale";

/** Loader simulant les langues mémorisées en base (`User.preferredLocale`). */
function makeLoader(stored: Record<string, string | null>) {
  return vi.fn<RecipientLocaleLoader>(async (userIds) =>
    new Map(userIds.filter((id) => id in stored).map((id) => [id, stored[id]])),
  );
}

describe("createEmailLocaleResolver", () => {
  beforeEach(() => {
    getLocaleMock.mockReset();
    getTranslationsMock.mockReset();
    getTranslationsMock.mockImplementation(({ locale }: { locale: string }) =>
      Promise.resolve(((key: string) => `[${locale}]${key}`) as unknown),
    );
  });

  describe("given a Host triggers from /en and approves a member who chose English", () => {
    it("sends the approval in English to the member, not in the default French", async () => {
      getLocaleMock.mockResolvedValue("en");
      const resolver = await createEmailLocaleResolver(
        "host-user",
        makeLoader({ "member-en": "en" }),
      );

      expect(await resolver.resolveFor("host-user")).toBe("en");
      expect(await resolver.resolveFor("member-en")).toBe("en");
    });
  });

  describe("given the trigger acts from a page in a given language", () => {
    it("keeps the page language for the trigger, whatever is stored", async () => {
      getLocaleMock.mockResolvedValue("en");
      const loader = makeLoader({ "trigger-user": "fr" });
      const resolver = await createEmailLocaleResolver("trigger-user", loader);

      expect(await resolver.resolveFor("trigger-user")).toBe("en");
      expect(loader).not.toHaveBeenCalled();
    });
  });

  describe("given recipients without a usable stored language", () => {
    it.each([
      ["no stored language", { "user-1": null }],
      ["unknown user", {}],
      ["unsupported stored language", { "user-1": "nl" }],
    ])("falls back to the default locale (%s)", async (_label, stored) => {
      getLocaleMock.mockResolvedValue("en");
      const resolver = await createEmailLocaleResolver("host-user", makeLoader(stored));

      expect(await resolver.resolveFor("user-1")).toBe(DEFAULT_RECIPIENT_LOCALE);
    });

    it("falls back to the default locale for a missing recipient id", async () => {
      getLocaleMock.mockResolvedValue("en");
      const resolver = await createEmailLocaleResolver("host-user", makeLoader({}));

      expect(await resolver.resolveFor(null)).toBe(DEFAULT_RECIPIENT_LOCALE);
      expect(await resolver.resolveFor(undefined)).toBe(DEFAULT_RECIPIENT_LOCALE);
    });
  });

  describe("given a batch of recipients in several languages", () => {
    it("groups them by language with a single lookup and the right translations", async () => {
      getLocaleMock.mockResolvedValue("fr");
      const loader = makeLoader({ a: "en", b: "fr", c: null, d: "en" });
      const resolver = await createEmailLocaleResolver("host-user", loader);

      const recipients = ["a", "b", "c", "d"].map((userId) => ({ userId }));
      const groups = await resolver.groupByLocale(recipients, (r) => r.userId);

      expect(loader).toHaveBeenCalledTimes(1);
      const byLocale = Object.fromEntries(
        groups.map((g) => [g.locale, g.items.map((r) => r.userId)]),
      );
      expect(byLocale).toEqual({ en: ["a", "d"], fr: ["b", "c"] });
      expect(getTranslationsMock).toHaveBeenCalledWith({ locale: "en", namespace: "Email" });
    });

    it("returns no group and makes no lookup for an empty batch", async () => {
      getLocaleMock.mockResolvedValue("fr");
      const loader = makeLoader({});
      const resolver = await createEmailLocaleResolver("host-user", loader);

      expect(await resolver.groupByLocale([] as string[], (id) => id)).toEqual([]);
      expect(loader).not.toHaveBeenCalled();
    });

    it("puts the trigger in the language of its page", async () => {
      getLocaleMock.mockResolvedValue("en");
      const resolver = await createEmailLocaleResolver(
        "host-user",
        makeLoader({ "host-user": "fr", other: "fr" }),
      );

      const groups = await resolver.groupByLocale(["host-user", "other"], (id) => id);

      const byLocale = Object.fromEntries(groups.map((g) => [g.locale, g.items]));
      expect(byLocale).toEqual({ en: ["host-user"], fr: ["other"] });
    });
  });

  describe("given several lookups for the same recipients", () => {
    it("loads each language and each translation set only once (cache)", async () => {
      getLocaleMock.mockResolvedValue("en");
      const loader = makeLoader({ "host-1": "fr", "host-2": "fr" });
      const resolver = await createEmailLocaleResolver("trigger-user", loader);

      await resolver.groupByLocale(["host-1", "host-2"], (id) => id);
      await resolver.translationsFor("host-1");
      await resolver.translationsFor("trigger-user");
      await resolver.translationsFor("trigger-user");

      expect(loader).toHaveBeenCalledTimes(1);
      // 2 locales distinctes (fr + en) → 2 chargements de traductions seulement
      expect(getTranslationsMock).toHaveBeenCalledTimes(2);
    });
  });
});

describe("toRecipientLocale", () => {
  it.each([
    ["en", "en"],
    ["fr", "fr"],
    [null, DEFAULT_RECIPIENT_LOCALE],
    [undefined, DEFAULT_RECIPIENT_LOCALE],
    ["nl", DEFAULT_RECIPIENT_LOCALE],
  ])("maps stored language %s to %s", (stored, expected) => {
    expect(toRecipientLocale(stored)).toBe(expected);
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildAlternates, isCircleIndexable } from "@/lib/seo";

const APP_URL = "https://the-playground.fr";

describe("buildAlternates", () => {
  let originalAppUrl: string | undefined;

  beforeEach(() => {
    originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = APP_URL;
  });

  afterEach(() => {
    if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  describe("given a sub-path", () => {
    it("on FR locale, canonical points to the FR URL", () => {
      const result = buildAlternates("fr", "/m/abc");
      expect(result.canonical).toBe(`${APP_URL}/m/abc`);
    });

    it("on EN locale, canonical points to the EN URL (self-reference, not FR)", () => {
      const result = buildAlternates("en", "/m/abc");
      expect(result.canonical).toBe(`${APP_URL}/en/m/abc`);
    });

    it("languages are identical across locales", () => {
      const fr = buildAlternates("fr", "/m/abc");
      const en = buildAlternates("en", "/m/abc");
      expect(fr.languages).toEqual(en.languages);
    });

    it("languages include fr, en and x-default with x-default pointing to FR", () => {
      const result = buildAlternates("fr", "/circles/xyz");
      expect(result.languages).toEqual({
        fr: `${APP_URL}/circles/xyz`,
        en: `${APP_URL}/en/circles/xyz`,
        "x-default": `${APP_URL}/circles/xyz`,
      });
    });
  });

  describe("given the home page", () => {
    it("with empty path, FR canonical has no trailing slash", () => {
      const result = buildAlternates("fr", "");
      expect(result.canonical).toBe(APP_URL);
      expect(result.languages.fr).toBe(APP_URL);
      expect(result.languages.en).toBe(`${APP_URL}/en`);
      expect(result.languages["x-default"]).toBe(APP_URL);
    });

    it("with empty path on EN, canonical is /en (no trailing slash)", () => {
      const result = buildAlternates("en", "");
      expect(result.canonical).toBe(`${APP_URL}/en`);
    });

    it("with '/' path, behaves like empty path (no double slash)", () => {
      const result = buildAlternates("fr", "/");
      expect(result.canonical).toBe(APP_URL);
    });
  });

  describe("given a nested path", () => {
    it("preserves the full path on both locales", () => {
      const result = buildAlternates("fr", "/legal/mentions-legales");
      expect(result.languages.fr).toBe(`${APP_URL}/legal/mentions-legales`);
      expect(result.languages.en).toBe(`${APP_URL}/en/legal/mentions-legales`);
    });
  });

  describe("given an unknown locale string", () => {
    it("falls back to FR as the canonical (defensive default)", () => {
      const result = buildAlternates("de", "/about");
      expect(result.canonical).toBe(`${APP_URL}/about`);
    });
  });
});

describe("isCircleIndexable", () => {
  describe("given a public Circle", () => {
    it("is indexable (noindex off, JSON-LD + sitemap allowed)", () => {
      expect(isCircleIndexable({ visibility: "PUBLIC" })).toBe(true);
    });
  });

  describe("given a private Circle", () => {
    it("is NOT indexable (page reachable by direct link, hidden from crawlers)", () => {
      expect(isCircleIndexable({ visibility: "PRIVATE" })).toBe(false);
    });
  });

  describe("given a missing Circle (fail-safe)", () => {
    it("is NOT indexable when null", () => {
      expect(isCircleIndexable(null)).toBe(false);
    });

    it("is NOT indexable when undefined", () => {
      expect(isCircleIndexable(undefined)).toBe(false);
    });
  });
});

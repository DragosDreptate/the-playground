import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildAlternates,
  buildUgcIndexing,
  buildSocialMetadata,
  isCircleIndexable,
  isMomentIndexable,
} from "@/lib/seo";

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

describe("buildSocialMetadata", () => {
  describe("given a title and a description", () => {
    it("emits an Open Graph website block carrying both", () => {
      const result = buildSocialMetadata("Mon titre", "Ma description");
      expect(result.openGraph).toEqual({
        title: "Mon titre",
        description: "Ma description",
        type: "website",
      });
    });

    it("emits a summary_large_image Twitter card carrying both", () => {
      const result = buildSocialMetadata("Mon titre", "Ma description");
      expect(result.twitter).toEqual({
        card: "summary_large_image",
        title: "Mon titre",
        description: "Ma description",
      });
    });

    // Le découplage indexation/aperçu repose sur ce contrat : le helper produit
    // l'aperçu social sans aucune notion de visibilité. Un Circle/Moment privé
    // partagé par lien doit afficher le même aperçu qu'un public ; seul `robots`
    // (côté generateMetadata) dépend de la visibilité, jamais l'Open Graph.
    it("never gates the social preview on visibility (no robots/index keys)", () => {
      const result = buildSocialMetadata("x", "y") as Record<string, unknown>;
      expect(result.robots).toBeUndefined();
      expect(Object.keys(result).sort()).toEqual(["openGraph", "twitter"]);
    });
  });
});

describe("isCircleIndexable", () => {
  describe("given a public Circle", () => {
    it("is indexable (noindex off, JSON-LD + sitemap allowed)", () => {
      expect(isCircleIndexable({ visibility: "PUBLIC", isDemo: false })).toBe(true);
    });
  });

  describe("given a private Circle", () => {
    it("is NOT indexable (page reachable by direct link, hidden from crawlers)", () => {
      expect(isCircleIndexable({ visibility: "PRIVATE", isDemo: false })).toBe(false);
    });
  });

  describe("given a public demo Circle", () => {
    it("is NOT indexable (showcase content, not a real community)", () => {
      expect(isCircleIndexable({ visibility: "PUBLIC", isDemo: true })).toBe(false);
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

describe("isMomentIndexable", () => {
  const publicCircle = { visibility: "PUBLIC" as const, isDemo: false };

  describe.each([
    { case: "a description", description: "Atelier aquarelle au parc", circle: publicCircle, expected: true },
    { case: "an empty description", description: "", circle: publicCircle, expected: false },
    { case: "a whitespace-only description", description: "  \n\t ", circle: publicCircle, expected: false },
    { case: "a description but a private Circle", description: "Atelier", circle: { visibility: "PRIVATE" as const, isDemo: false }, expected: false },
    { case: "a description but a demo Circle", description: "Atelier", circle: { visibility: "PUBLIC" as const, isDemo: true }, expected: false },
    { case: "a description but no Circle", description: "Atelier", circle: null, expected: false },
  ])("given a Moment with $case", ({ description, circle, expected }) => {
    it(`is ${expected ? "" : "NOT "}indexable`, () => {
      expect(isMomentIndexable({ description }, circle)).toBe(expected);
    });
  });
});

describe("buildUgcIndexing", () => {
  let originalAppUrl: string | undefined;

  beforeEach(() => {
    originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = APP_URL;
  });

  afterEach(() => {
    if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  describe("given an indexable page on FR", () => {
    it("is indexable, self-canonical, without hreflang to the EN version", () => {
      expect(buildUgcIndexing("fr", "/m/abc", true)).toEqual({
        alternates: { canonical: `${APP_URL}/m/abc` },
      });
    });
  });

  describe("given an indexable page on EN", () => {
    it("is noindex but followed, so Google reaches the linked FR pages", () => {
      expect(buildUgcIndexing("en", "/m/abc", true)).toEqual({
        alternates: { canonical: `${APP_URL}/en/m/abc` },
        robots: { index: false, follow: true },
      });
    });
  });

  describe.each(["fr", "en"])("given a non-indexable page on %s", (locale) => {
    it("is noindex and nofollow", () => {
      expect(buildUgcIndexing(locale, "/circles/xyz", false).robots).toEqual({
        index: false,
        follow: false,
      });
    });
  });

  describe("given an unknown locale string", () => {
    it("falls back to FR (indexable, FR canonical)", () => {
      expect(buildUgcIndexing("de", "/m/abc", true)).toEqual({
        alternates: { canonical: `${APP_URL}/m/abc` },
      });
    });
  });
});

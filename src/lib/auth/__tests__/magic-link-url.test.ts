import { describe, it, expect } from "vitest";
import { detectLocaleForMagicLink } from "@/lib/auth/magic-link-url";

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("https://app.example.com/api/auth/signin/resend", {
    headers,
  });
}

function authUrl(callbackPath: string | null): string {
  const params = new URLSearchParams({ token: "abc", email: "user@example.com" });
  if (callbackPath !== null) params.set("callbackUrl", callbackPath);
  return `https://app.example.com/api/auth/callback/resend?${params}`;
}

describe("detectLocaleForMagicLink", () => {
  describe("given a callbackUrl with a locale prefix", () => {
    it.each([
      ["/fr/m/foo", "fr"],
      ["/en/m/foo", "en"],
      ["/fr/dashboard/circles/x", "fr"],
      ["/en/", "en"],
    ])("should return %s for callbackUrl=%s", (callback, expected) => {
      const result = detectLocaleForMagicLink(authUrl(callback), makeRequest());
      expect(result).toBe(expected);
    });

    it("should accept an absolute callbackUrl", () => {
      const url = authUrl("https://the-playground.fr/fr/m/foo");
      expect(detectLocaleForMagicLink(url, makeRequest())).toBe("fr");
    });

    // Non-régression : depuis le portage du callbackUrl dans la query, le
    // `redirectTo` Auth.js vaut `/${locale}/dashboard/profile/setup?callbackUrl=...`.
    // La langue doit toujours se déduire du préfixe de tête, pas du param imbriqué.
    it.each([
      ["/fr/dashboard/profile/setup?callbackUrl=/m/foo", "fr"],
      ["/en/dashboard/profile/setup?callbackUrl=/en/m/foo", "en"],
    ])("should read the head locale prefix of a setup redirect (%s)", (callback, expected) => {
      expect(detectLocaleForMagicLink(authUrl(callback), makeRequest())).toBe(expected);
    });

    it("should beat the cookie when the prefix says otherwise", () => {
      const request = makeRequest({ cookie: "NEXT_LOCALE=en" });
      expect(detectLocaleForMagicLink(authUrl("/fr/m/foo"), request)).toBe("fr");
    });

    it("should beat the accept-language header", () => {
      const request = makeRequest({ "accept-language": "en-US,en;q=0.9" });
      expect(detectLocaleForMagicLink(authUrl("/fr/m/foo"), request)).toBe("fr");
    });
  });

  describe("given no usable locale prefix in callbackUrl", () => {
    it("should fall back to NEXT_LOCALE cookie", () => {
      const request = makeRequest({ cookie: "NEXT_LOCALE=en; foo=bar" });
      expect(detectLocaleForMagicLink(authUrl("/dashboard"), request)).toBe("en");
    });

    it("should fall back to accept-language when no cookie", () => {
      const request = makeRequest({ "accept-language": "en-US,en;q=0.9" });
      expect(detectLocaleForMagicLink(authUrl("/dashboard"), request)).toBe("en");
    });

    it("should fall back to defaultLocale (fr) when nothing else", () => {
      expect(detectLocaleForMagicLink(authUrl("/dashboard"), makeRequest())).toBe("fr");
    });

    it("should ignore an unknown locale in the cookie", () => {
      const request = makeRequest({ cookie: "NEXT_LOCALE=xx" });
      expect(detectLocaleForMagicLink(authUrl("/dashboard"), request)).toBe("fr");
    });
  });

  describe("given a missing or malformed callbackUrl", () => {
    it("should fall back to defaultLocale when callbackUrl is absent", () => {
      expect(detectLocaleForMagicLink(authUrl(null), makeRequest())).toBe("fr");
    });

    it("should fall back to defaultLocale when callbackUrl is empty", () => {
      expect(detectLocaleForMagicLink(authUrl(""), makeRequest())).toBe("fr");
    });

    it("should fall back to defaultLocale when the auth URL itself is malformed", () => {
      expect(detectLocaleForMagicLink("not-a-url", makeRequest())).toBe("fr");
    });
  });
});

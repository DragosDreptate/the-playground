import { describe, it, expect } from "vitest";
import { buildMagicLinkConfirmUrl } from "@/lib/auth/magic-link-url";

const AUTH_URL =
  "https://app.example.com/api/auth/callback/resend?token=abc&email=user%40example.com&callbackUrl=%2Fdashboard";

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("https://app.example.com/api/auth/signin/resend", {
    headers,
  });
}

describe("buildMagicLinkConfirmUrl", () => {
  describe("given a default-locale visitor", () => {
    it("should point to /auth/confirm without locale prefix", () => {
      const result = buildMagicLinkConfirmUrl(AUTH_URL, makeRequest());
      const url = new URL(result);
      expect(url.pathname).toBe("/auth/confirm");
    });

    it("should preserve token, email and callbackUrl query params", () => {
      const result = buildMagicLinkConfirmUrl(AUTH_URL, makeRequest());
      const url = new URL(result);
      expect(url.searchParams.get("token")).toBe("abc");
      expect(url.searchParams.get("email")).toBe("user@example.com");
      expect(url.searchParams.get("callbackUrl")).toBe("/dashboard");
    });

    it("should keep the original origin", () => {
      const result = buildMagicLinkConfirmUrl(AUTH_URL, makeRequest());
      const url = new URL(result);
      expect(url.origin).toBe("https://app.example.com");
    });
  });

  describe("given a visitor with NEXT_LOCALE=en cookie", () => {
    it("should prefix the path with /en", () => {
      const request = makeRequest({ cookie: "NEXT_LOCALE=en; foo=bar" });
      const result = buildMagicLinkConfirmUrl(AUTH_URL, request);
      const url = new URL(result);
      expect(url.pathname).toBe("/en/auth/confirm");
    });
  });

  describe("given a visitor with Accept-Language en when no cookie", () => {
    it("should fall back to /en", () => {
      const request = makeRequest({ "accept-language": "en-US,en;q=0.9" });
      const result = buildMagicLinkConfirmUrl(AUTH_URL, request);
      const url = new URL(result);
      expect(url.pathname).toBe("/en/auth/confirm");
    });
  });

  describe("given an unknown locale in the cookie", () => {
    it("should fall back to default locale", () => {
      const request = makeRequest({ cookie: "NEXT_LOCALE=xx" });
      const result = buildMagicLinkConfirmUrl(AUTH_URL, request);
      const url = new URL(result);
      expect(url.pathname).toBe("/auth/confirm");
    });
  });
});

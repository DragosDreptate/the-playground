import { describe, it, expect, afterEach, vi } from "vitest";
import { isInAppBrowser, isLinkedInInAppBrowser } from "@/lib/detect-webview";

const LINKEDIN_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.32.1536";
const INSTAGRAM_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 300.0";
const SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

function stubUserAgent(ua: string) {
  vi.stubGlobal("navigator", { userAgent: ua });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isInAppBrowser", () => {
  it.each([
    ["LinkedIn webview", LINKEDIN_UA, true],
    ["Instagram webview", INSTAGRAM_UA, true],
    ["Safari", SAFARI_UA, false],
  ])("should return %s -> %s", (_label, ua, expected) => {
    stubUserAgent(ua);
    expect(isInAppBrowser()).toBe(expected);
  });
});

describe("isLinkedInInAppBrowser", () => {
  it("should detect the LinkedIn in-app browser", () => {
    stubUserAgent(LINKEDIN_UA);
    expect(isLinkedInInAppBrowser()).toBe(true);
  });

  it.each([
    ["Instagram webview", INSTAGRAM_UA],
    ["Safari", SAFARI_UA],
  ])("should not flag %s as the LinkedIn webview", (_label, ua) => {
    stubUserAgent(ua);
    expect(isLinkedInInAppBrowser()).toBe(false);
  });
});

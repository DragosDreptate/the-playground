import { describe, it, expect, vi } from "vitest";

import { isShareSupported, tryShare } from "../share";

function makeNavigator(share?: (data: ShareData) => Promise<void>): Navigator {
  return { share } as unknown as Navigator;
}

describe("isShareSupported", () => {
  describe("given a navigator with share function", () => {
    it("should return true", () => {
      expect(isShareSupported(makeNavigator(vi.fn(async () => {})))).toBe(true);
    });
  });

  describe("given a navigator without share function", () => {
    it("should return false", () => {
      expect(isShareSupported(makeNavigator())).toBe(false);
    });
  });

  describe("given no navigator (SSR)", () => {
    it("should return false", () => {
      expect(isShareSupported(undefined)).toBe(false);
    });
  });
});

describe("tryShare", () => {
  describe("given the share API is unsupported", () => {
    it("should return 'unsupported' without throwing", async () => {
      expect(await tryShare("https://example.com", undefined)).toBe("unsupported");
      expect(await tryShare("https://example.com", makeNavigator())).toBe("unsupported");
    });
  });

  describe("given navigator.share resolves successfully", () => {
    it("should call navigator.share with the url and return 'shared'", async () => {
      const share = vi.fn(async () => {});
      const result = await tryShare("https://the-playground.fr/m/foo", makeNavigator(share));

      expect(result).toBe("shared");
      expect(share).toHaveBeenCalledWith({ url: "https://the-playground.fr/m/foo" });
    });
  });

  describe("given navigator.share rejects with AbortError (user cancels)", () => {
    it("should return 'cancelled'", async () => {
      const share = vi.fn(async () => {
        throw new DOMException("user cancelled", "AbortError");
      });

      expect(await tryShare("https://example.com", makeNavigator(share))).toBe("cancelled");
    });
  });

  describe("given navigator.share rejects with another error", () => {
    it("should return 'error' and not propagate", async () => {
      const share = vi.fn(async () => {
        throw new Error("permission denied");
      });

      expect(await tryShare("https://example.com", makeNavigator(share))).toBe("error");
    });

    it("should treat unknown DOMExceptions as errors", async () => {
      const share = vi.fn(async () => {
        throw new DOMException("nope", "NotAllowedError");
      });

      expect(await tryShare("https://example.com", makeNavigator(share))).toBe("error");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const captureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));

import { handleLocaleGroupFailures, sendEachLocaleGroup } from "../send-each-locale-group";

describe("sendEachLocaleGroup", () => {
  beforeEach(() => captureException.mockReset());

  describe("given the French batch fails but the English one succeeds", () => {
    it("should still send the English batch and report the failure to Sentry", async () => {
      const sent: string[] = [];
      const send = vi.fn(async (locale: string) => {
        if (locale === "fr") throw new Error("Resend down");
        sent.push(locale);
      });

      await expect(sendEachLocaleGroup(["fr", "en"], send, "test")).resolves.toBeUndefined();

      expect(sent).toEqual(["en"]);
      expect(captureException).toHaveBeenCalledTimes(1);
    });
  });

  describe("given every batch fails", () => {
    it("should throw the first error and report the others to Sentry", async () => {
      const send = vi.fn(async (locale: string) => {
        throw new Error(`fail ${locale}`);
      });

      await expect(sendEachLocaleGroup(["fr", "en"], send, "test")).rejects.toThrow("fail fr");
      expect(send).toHaveBeenCalledTimes(2);
      expect(captureException).toHaveBeenCalledTimes(1);
      expect((captureException.mock.calls[0][0] as Error).message).toBe("fail en");
    });
  });

  describe("given no batch", () => {
    it("should do nothing", async () => {
      const send = vi.fn();

      await sendEachLocaleGroup([], send, "test");

      expect(send).not.toHaveBeenCalled();
    });
  });

  describe("handleLocaleGroupFailures", () => {
    it("should throw the first error and report the others when nothing was sent", () => {
      expect(() =>
        handleLocaleGroupFailures([new Error("a"), new Error("b")], true, "test")
      ).toThrow("a");
      expect(captureException).toHaveBeenCalledTimes(1);
    });

    it("should only report when something was sent", () => {
      expect(() =>
        handleLocaleGroupFailures([new Error("a")], false, "test")
      ).not.toThrow();
      expect(captureException).toHaveBeenCalledTimes(1);
    });
  });
});

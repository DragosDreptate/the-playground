import { describe, it, expect, vi, beforeEach } from "vitest";
import { toActionResult } from "../to-action-result";
import { DomainError } from "@/domain/errors/domain-error";

const captureSpy = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: (err: unknown) => captureSpy(err),
}));

class FakeDomainError extends DomainError {
  readonly code = "FAKE_CODE";
  constructor(message = "Fake domain failure") {
    super(message);
  }
}

describe("toActionResult", () => {
  beforeEach(() => {
    captureSpy.mockClear();
  });

  describe("given the wrapped fn resolves", () => {
    it("should return a success result wrapping the resolved data", async () => {
      const result = await toActionResult(async () => ({ id: 1, name: "foo" }));

      expect(result).toEqual({
        success: true,
        data: { id: 1, name: "foo" },
      });
      expect(captureSpy).not.toHaveBeenCalled();
    });

    it("should preserve void/null payloads", async () => {
      const voidResult = await toActionResult(async () => undefined);
      expect(voidResult).toEqual({ success: true, data: undefined });

      const nullResult = await toActionResult(async () => null);
      expect(nullResult).toEqual({ success: true, data: null });
    });
  });

  describe("given the wrapped fn throws a DomainError", () => {
    it("should map the error to { success: false, error, code } from the domain error", async () => {
      const result = await toActionResult(async () => {
        throw new FakeDomainError("Something is wrong");
      });

      expect(result).toEqual({
        success: false,
        error: "Something is wrong",
        code: "FAKE_CODE",
      });
      expect(captureSpy).not.toHaveBeenCalled();
    });
  });

  describe("given the wrapped fn throws a non-domain error", () => {
    it("should send to Sentry and return INTERNAL_ERROR with the default fallback", async () => {
      const error = new Error("kaboom");
      const result = await toActionResult(async () => {
        throw error;
      });

      expect(result).toEqual({
        success: false,
        error: "Une erreur est survenue",
        code: "INTERNAL_ERROR",
      });
      expect(captureSpy).toHaveBeenCalledTimes(1);
      expect(captureSpy).toHaveBeenCalledWith(error);
    });

    it("should use the caller-provided fallback message when given", async () => {
      const result = await toActionResult(
        async () => {
          throw new Error("nope");
        },
        "Erreur lors de l'envoi"
      );

      expect(result).toEqual({
        success: false,
        error: "Erreur lors de l'envoi",
        code: "INTERNAL_ERROR",
      });
    });
  });
});

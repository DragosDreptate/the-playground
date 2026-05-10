import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { isTransientError } from "../retry-policy";

describe("isTransientError", () => {
  describe("given a Neon control plane error", () => {
    it.each([
      "Control plane request failed",
      "Control plane request timed out",
      "DriverAdapterError: Control plane request failed",
    ])("should treat %s as transient", (message) => {
      expect(isTransientError(new Error(message))).toBe(true);
    });
  });

  describe("given a connection-level error", () => {
    it.each([
      "Connection terminated unexpectedly",
      "ECONNRESET",
      "ETIMEDOUT",
      "socket hang up",
      "too many connections",
    ])("should treat %s as transient", (message) => {
      expect(isTransientError(new Error(message))).toBe(true);
    });
  });

  describe("given a known Prisma connection error code", () => {
    it.each(["P1008", "P1011", "P1015", "P1017", "P2024"])(
      "should treat %s as transient",
      (code) => {
        const error = new Prisma.PrismaClientKnownRequestError("boom", {
          code,
          clientVersion: "test",
        });
        expect(isTransientError(error)).toBe(true);
      },
    );
  });

  describe("given a non-transient error", () => {
    it("should not retry a unique constraint violation (P2002)", () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed",
        { code: "P2002", clientVersion: "test" },
      );
      expect(isTransientError(error)).toBe(false);
    });

    it("should not retry an unrelated error message", () => {
      expect(isTransientError(new Error("Validation failed"))).toBe(false);
    });

    it("should not retry a non-Error value", () => {
      expect(isTransientError("oops")).toBe(false);
      expect(isTransientError(null)).toBe(false);
      expect(isTransientError(undefined)).toBe(false);
    });
  });
});

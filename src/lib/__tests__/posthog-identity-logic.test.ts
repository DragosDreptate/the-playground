import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearLastIdentifiedUserId,
  decideIdentityAction,
  isSignupTracked,
  markSignupTracked,
  readLastIdentifiedUserId,
  writeLastIdentifiedUserId,
} from "../posthog-identity-logic";

describe("decideIdentityAction", () => {
  describe("given an anonymous visitor", () => {
    it("should do nothing when never identified before (preserves anonymous identity)", () => {
      expect(decideIdentityAction(null, null)).toEqual({ type: "none" });
    });

    it("should reset when a user was identified before (real sign-out)", () => {
      expect(decideIdentityAction(null, "user-A")).toEqual({ type: "reset" });
    });
  });

  describe("given a logged-in user", () => {
    it("should identify a freshly logged-in user (none identified before)", () => {
      expect(decideIdentityAction("user-A", null)).toEqual({
        type: "identify",
        userId: "user-A",
      });
    });

    it("should re-identify the same user on every render to keep properties fresh", () => {
      expect(decideIdentityAction("user-A", "user-A")).toEqual({
        type: "identify",
        userId: "user-A",
      });
    });

    it("should identify the new user on an account switch", () => {
      expect(decideIdentityAction("user-B", "user-A")).toEqual({
        type: "identify",
        userId: "user-B",
      });
    });
  });
});

describe("localStorage helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubStorage() {
    const store = new Map<string, string>();
    const localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    vi.stubGlobal("window", { localStorage });
    return store;
  }

  describe("given localStorage is available", () => {
    it("should write then read back the last identified user", () => {
      stubStorage();
      writeLastIdentifiedUserId("user-A");
      expect(readLastIdentifiedUserId()).toBe("user-A");
    });

    it("should clear the last identified user", () => {
      stubStorage();
      writeLastIdentifiedUserId("user-A");
      clearLastIdentifiedUserId();
      expect(readLastIdentifiedUserId()).toBeNull();
    });

    it("should track and report the signup flag per user", () => {
      stubStorage();
      expect(isSignupTracked("user-A")).toBe(false);
      markSignupTracked("user-A");
      expect(isSignupTracked("user-A")).toBe(true);
      expect(isSignupTracked("user-B")).toBe(false);
    });
  });

  describe("given localStorage is unavailable (SSR)", () => {
    it("should return null when reading the last identified user", () => {
      // window is not stubbed -> accessing window throws -> degrades to null
      expect(readLastIdentifiedUserId()).toBeNull();
    });

    it("should report the signup flag as not tracked", () => {
      expect(isSignupTracked("user-A")).toBe(false);
    });
  });

  describe("given localStorage throws (private mode, quota)", () => {
    function stubThrowingStorage() {
      vi.stubGlobal("window", {
        localStorage: {
          getItem: () => {
            throw new Error("blocked");
          },
          setItem: () => {
            throw new Error("QuotaExceededError");
          },
          removeItem: () => {
            throw new Error("blocked");
          },
        },
      });
    }

    it("should not throw when writing or clearing the last identified user", () => {
      stubThrowingStorage();
      expect(() => writeLastIdentifiedUserId("user-A")).not.toThrow();
      expect(() => clearLastIdentifiedUserId()).not.toThrow();
    });

    it("should not throw and report signup as not tracked", () => {
      stubThrowingStorage();
      expect(() => markSignupTracked("user-A")).not.toThrow();
      expect(isSignupTracked("user-A")).toBe(false);
    });
  });
});

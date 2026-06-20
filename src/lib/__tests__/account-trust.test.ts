import { describe, it, expect } from "vitest";
import {
  isNewAccount,
  NEW_ACCOUNT_WINDOW_HOURS,
  NEW_ACCOUNT_WINDOW_MS,
} from "@/lib/account-trust";

describe("isNewAccount", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("should be true for an account created a few minutes ago", () => {
    const createdAt = new Date(now.getTime() - 10 * 60 * 1000);
    expect(isNewAccount(createdAt, now)).toBe(true);
  });

  it("should be true just under the 24h window", () => {
    const createdAt = new Date(now.getTime() - (NEW_ACCOUNT_WINDOW_MS - 1));
    expect(isNewAccount(createdAt, now)).toBe(true);
  });

  it("should be false exactly at the 24h boundary (strict <)", () => {
    const createdAt = new Date(now.getTime() - NEW_ACCOUNT_WINDOW_MS);
    expect(isNewAccount(createdAt, now)).toBe(false);
  });

  it("should be false for an account older than 24h", () => {
    const createdAt = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    expect(isNewAccount(createdAt, now)).toBe(false);
  });

  it("should accept a serialized createdAt (ISO string, e.g. from a NextAuth session)", () => {
    const recentIso = new Date(now.getTime() - 60 * 1000).toISOString();
    expect(isNewAccount(recentIso, now)).toBe(true);
    const oldIso = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    expect(isNewAccount(oldIso, now)).toBe(false);
  });

  it("should accept a createdAt as epoch millis (number)", () => {
    expect(isNewAccount(now.getTime() - 60 * 1000, now)).toBe(true);
    expect(isNewAccount(now.getTime() - 48 * 60 * 60 * 1000, now)).toBe(false);
  });

  it("should expose a 24h window", () => {
    expect(NEW_ACCOUNT_WINDOW_HOURS).toBe(24);
    expect(NEW_ACCOUNT_WINDOW_MS).toBe(24 * 60 * 60 * 1000);
  });
});

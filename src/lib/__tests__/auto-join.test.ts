import { describe, it, expect } from "vitest";
import {
  AUTO_JOIN_PARAM,
  withAutoJoin,
  canAutoJoin,
  signInUrlWithAutoJoin,
} from "@/lib/auto-join";

describe("withAutoJoin", () => {
  it("should append the join marker to a path", () => {
    expect(withAutoJoin("/m/cloud-pi-native")).toBe(
      `/m/cloud-pi-native?${AUTO_JOIN_PARAM}=1`
    );
    expect(withAutoJoin("/circles/the-spark")).toBe(
      `/circles/the-spark?${AUTO_JOIN_PARAM}=1`
    );
  });
});

describe("signInUrlWithAutoJoin", () => {
  it("should build a sign-in URL with the encoded callbackUrl carrying the join marker", () => {
    expect(signInUrlWithAutoJoin("fr", "/fr/m/cloud-pi-native")).toBe(
      `/fr/auth/sign-in?callbackUrl=${encodeURIComponent(
        `/fr/m/cloud-pi-native?${AUTO_JOIN_PARAM}=1`
      )}`
    );
    expect(signInUrlWithAutoJoin("en", "/en/circles/the-spark")).toBe(
      `/en/auth/sign-in?callbackUrl=${encodeURIComponent(
        `/en/circles/the-spark?${AUTO_JOIN_PARAM}=1`
      )}`
    );
  });
});

describe("canAutoJoin", () => {
  it("should allow auto-join for an authenticated, non-engaged, non-blocked user", () => {
    expect(
      canAutoJoin({ isAuthenticated: true, alreadyEngaged: false, blocked: false })
    ).toBe(true);
  });

  it.each([
    ["not authenticated", { isAuthenticated: false, alreadyEngaged: false, blocked: false }],
    ["already engaged", { isAuthenticated: true, alreadyEngaged: true, blocked: false }],
    ["blocked (e.g. paid)", { isAuthenticated: true, alreadyEngaged: false, blocked: true }],
  ])("should refuse auto-join when %s", (_label, opts) => {
    expect(canAutoJoin(opts)).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { AUTO_JOIN_PARAM, withAutoJoin, canAutoJoin } from "@/lib/auto-join";

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

import { describe, it, expect } from "vitest";
import { dashboardEventPublicPath } from "@/lib/dashboard-event-public-redirect";

describe("dashboardEventPublicPath", () => {
  describe("matching dashboard event URLs", () => {
    it.each([
      [
        "/dashboard/circles/the-spark/moments/soiree-js",
        "/m/soiree-js",
      ],
      [
        "/fr/dashboard/circles/the-spark/moments/soiree-js",
        "/fr/m/soiree-js",
      ],
      [
        "/en/dashboard/circles/the-spark/moments/soiree-js",
        "/en/m/soiree-js",
      ],
      [
        "/dashboard/circles/the-spark/moments/soiree-js/edit",
        "/m/soiree-js",
      ],
      [
        "/en/dashboard/circles/the-spark/moments/soiree-js/edit",
        "/en/m/soiree-js",
      ],
      [
        "/dashboard/circles/the-spark/moments/event-with-many-words-123",
        "/m/event-with-many-words-123",
      ],
    ])("should resolve %s → %s", (input, expected) => {
      expect(dashboardEventPublicPath(input)).toBe(expected);
    });
  });

  describe("URLs that must not be redirected", () => {
    it.each([
      "/dashboard",
      "/dashboard/circles",
      "/dashboard/circles/the-spark",
      "/dashboard/circles/the-spark/moments",
      "/fr/dashboard",
      "/auth/sign-in",
      "/m/soiree-js",
      "/circles/the-spark",
      "/",
    ])("should return null for %s", (input) => {
      expect(dashboardEventPublicPath(input)).toBe(null);
    });
  });

  describe("reserved moment segments", () => {
    // /dashboard/circles/[slug]/moments/new is the event creation page,
    // not an event slug — must keep its normal auth redirect.
    it.each([
      "/dashboard/circles/the-spark/moments/new",
      "/fr/dashboard/circles/the-spark/moments/new",
      "/en/dashboard/circles/the-spark/moments/new",
    ])("should return null for %s (reserved segment)", (input) => {
      expect(dashboardEventPublicPath(input)).toBe(null);
    });
  });

  describe("invalid moment slug", () => {
    it.each([
      "/dashboard/circles/the-spark/moments/UPPERCASE",
      "/dashboard/circles/the-spark/moments/has--double-dash",
      "/dashboard/circles/the-spark/moments/-leading-dash",
    ])("should return null for invalid slug in %s", (input) => {
      expect(dashboardEventPublicPath(input)).toBe(null);
    });
  });
});

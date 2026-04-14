import { describe, it, expect } from "vitest";
import {
  dashboardCacheTag,
  serializeDashboardCircle,
  deserializeDashboardCircle,
  serializeHostMoment,
  deserializeHostMoment,
} from "@/lib/dashboard-cache";
import type { DashboardCircle } from "@/domain/models/circle";
import type { HostMomentSummary } from "@/domain/models/moment";

/**
 * Tests — dashboard-cache.ts
 *
 * Le risque le plus subtil de ce module est la sérialisation/désérialisation
 * Date pour traverser unstable_cache (qui sérialise via JSON.stringify et perd
 * silencieusement le type Date). Ces tests couvrent :
 *  - Le round-trip Date → string ISO → Date préserve la valeur exacte.
 *  - Le round-trip à travers JSON.stringify+parse (= ce que fait unstable_cache
 *    en interne) reconstitue les Date correctement.
 *  - Les champs nullables (endsAt, nextMoment) sont préservés.
 *  - Le format du tag d'invalidation est stable.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeDashboardCircle(overrides: Partial<DashboardCircle> = {}): DashboardCircle {
  const baseDate = new Date("2026-04-14T10:30:00.000Z");
  return {
    id: "circle-1",
    slug: "weekly-meetup",
    name: "Weekly Meetup",
    description: "A weekly community gathering.",
    logo: null,
    coverImage: null,
    coverImageAttribution: null,
    visibility: "PUBLIC",
    category: "TECH",
    customCategory: null,
    city: "Paris",
    website: null,
    stripeConnectAccountId: null,
    requiresApproval: false,
    isDemo: false,
    createdAt: baseDate,
    updatedAt: baseDate,
    memberRole: "PLAYER",
    membershipStatus: "ACTIVE",
    memberCount: 12,
    upcomingMomentCount: 3,
    topMembers: [
      {
        user: {
          firstName: "Alice",
          lastName: "Dupont",
          email: "alice@example.com",
          image: null,
        },
      },
    ],
    nextMoment: {
      title: "Next event",
      startsAt: new Date("2026-04-20T18:00:00.000Z"),
    },
    ...overrides,
  };
}

function makeHostMoment(overrides: Partial<HostMomentSummary> = {}): HostMomentSummary {
  return {
    id: "moment-1",
    slug: "spring-meetup",
    title: "Spring Meetup",
    coverImage: null,
    startsAt: new Date("2026-04-20T18:00:00.000Z"),
    endsAt: new Date("2026-04-20T20:00:00.000Z"),
    locationType: "IN_PERSON",
    locationName: "Le Wagon",
    status: "PUBLISHED",
    registrationCount: 5,
    topAttendees: [
      {
        user: {
          firstName: "Bob",
          lastName: "Martin",
          email: "bob@example.com",
          image: null,
        },
      },
    ],
    circle: { slug: "weekly-meetup", name: "Weekly Meetup", coverImage: null },
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// dashboardCacheTag
// ─────────────────────────────────────────────────────────────────────────────

describe("dashboardCacheTag", () => {
  describe("given a userId", () => {
    it("should return a tag prefixed with 'dashboard:'", () => {
      expect(dashboardCacheTag("user-123")).toBe("dashboard:user-123");
    });

    it("should preserve the userId verbatim (no transformation)", () => {
      expect(dashboardCacheTag("Alice@Example.COM")).toBe("dashboard:Alice@Example.COM");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DashboardCircle round-trip
// ─────────────────────────────────────────────────────────────────────────────

describe("serializeDashboardCircle / deserializeDashboardCircle", () => {
  describe("given a circle with a nextMoment", () => {
    it("should serialize Date fields to ISO strings and reconstitute them as Date", () => {
      const original = makeDashboardCircle();
      const serialized = serializeDashboardCircle(original);

      expect(typeof serialized.createdAt).toBe("string");
      expect(typeof serialized.updatedAt).toBe("string");
      expect(typeof serialized.nextMoment?.startsAt).toBe("string");

      const restored = deserializeDashboardCircle(serialized);

      expect(restored.createdAt).toBeInstanceOf(Date);
      expect(restored.updatedAt).toBeInstanceOf(Date);
      expect(restored.nextMoment?.startsAt).toBeInstanceOf(Date);

      expect(restored.createdAt.getTime()).toBe(original.createdAt.getTime());
      expect(restored.updatedAt.getTime()).toBe(original.updatedAt.getTime());
      expect(restored.nextMoment!.startsAt.getTime()).toBe(
        original.nextMoment!.startsAt.getTime()
      );
    });

    it("should preserve all non-Date fields verbatim", () => {
      const original = makeDashboardCircle();
      const restored = deserializeDashboardCircle(serializeDashboardCircle(original));

      expect(restored.id).toBe(original.id);
      expect(restored.slug).toBe(original.slug);
      expect(restored.name).toBe(original.name);
      expect(restored.memberCount).toBe(original.memberCount);
      expect(restored.upcomingMomentCount).toBe(original.upcomingMomentCount);
      expect(restored.topMembers).toEqual(original.topMembers);
      expect(restored.nextMoment?.title).toBe(original.nextMoment?.title);
    });
  });

  describe("given a circle without a nextMoment", () => {
    it("should preserve nextMoment as null", () => {
      const original = makeDashboardCircle({ nextMoment: null });
      const restored = deserializeDashboardCircle(serializeDashboardCircle(original));

      expect(restored.nextMoment).toBeNull();
    });
  });

  describe("given a JSON.stringify + parse round-trip (simulating unstable_cache)", () => {
    it("should still reconstitute valid Date objects after the cache roundtrip", () => {
      const original = makeDashboardCircle();
      const cached = JSON.parse(
        JSON.stringify(serializeDashboardCircle(original))
      );
      const restored = deserializeDashboardCircle(cached);

      expect(restored.createdAt).toBeInstanceOf(Date);
      expect(restored.createdAt.getTime()).toBe(original.createdAt.getTime());
      expect(restored.nextMoment?.startsAt).toBeInstanceOf(Date);
      expect(restored.nextMoment!.startsAt.getTime()).toBe(
        original.nextMoment!.startsAt.getTime()
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HostMomentSummary round-trip
// ─────────────────────────────────────────────────────────────────────────────

describe("serializeHostMoment / deserializeHostMoment", () => {
  describe("given a moment with both startsAt and endsAt", () => {
    it("should serialize Date fields to ISO strings and reconstitute them as Date", () => {
      const original = makeHostMoment();
      const serialized = serializeHostMoment(original);

      expect(typeof serialized.startsAt).toBe("string");
      expect(typeof serialized.endsAt).toBe("string");

      const restored = deserializeHostMoment(serialized);

      expect(restored.startsAt).toBeInstanceOf(Date);
      expect(restored.endsAt).toBeInstanceOf(Date);
      expect(restored.startsAt.getTime()).toBe(original.startsAt.getTime());
      expect(restored.endsAt!.getTime()).toBe(original.endsAt!.getTime());
    });

    it("should preserve all non-Date fields verbatim", () => {
      const original = makeHostMoment();
      const restored = deserializeHostMoment(serializeHostMoment(original));

      expect(restored.id).toBe(original.id);
      expect(restored.slug).toBe(original.slug);
      expect(restored.title).toBe(original.title);
      expect(restored.status).toBe(original.status);
      expect(restored.registrationCount).toBe(original.registrationCount);
      expect(restored.topAttendees).toEqual(original.topAttendees);
      expect(restored.circle).toEqual(original.circle);
    });
  });

  describe("given a moment without endsAt", () => {
    it("should preserve endsAt as null", () => {
      const original = makeHostMoment({ endsAt: null });
      const restored = deserializeHostMoment(serializeHostMoment(original));

      expect(restored.endsAt).toBeNull();
      expect(restored.startsAt).toBeInstanceOf(Date);
    });
  });

  describe("given a JSON.stringify + parse round-trip (simulating unstable_cache)", () => {
    it("should still reconstitute valid Date objects after the cache roundtrip", () => {
      const original = makeHostMoment();
      const cached = JSON.parse(JSON.stringify(serializeHostMoment(original)));
      const restored = deserializeHostMoment(cached);

      expect(restored.startsAt).toBeInstanceOf(Date);
      expect(restored.startsAt.getTime()).toBe(original.startsAt.getTime());
      expect(restored.endsAt!.getTime()).toBe(original.endsAt!.getTime());
    });
  });
});

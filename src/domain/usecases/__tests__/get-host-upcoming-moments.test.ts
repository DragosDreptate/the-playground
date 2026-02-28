import { describe, it, expect, vi } from "vitest";
import { getHostUpcomingMoments } from "@/domain/usecases/get-host-upcoming-moments";
import { createMockMomentRepository } from "./helpers/mock-moment-repository";
import type { HostMomentSummary } from "@/domain/models/moment";

function makeHostMomentSummary(
  overrides: Partial<HostMomentSummary> = {}
): HostMomentSummary {
  return {
    id: "moment-1",
    slug: "weekly-meetup",
    title: "Weekly Meetup",
    coverImage: null,
    startsAt: new Date("2026-03-15T18:00:00Z"),
    endsAt: new Date("2026-03-15T20:00:00Z"),
    locationType: "IN_PERSON",
    locationName: "Café Central",
    status: "PUBLISHED",
    registrationCount: 12,
    circle: {
      slug: "tech-paris",
      name: "Tech Paris",
      coverImage: null,
    },
    ...overrides,
  };
}

describe("GetHostUpcomingMoments", () => {
  // ─────────────────────────────────────────────────────────────
  // Happy paths
  // ─────────────────────────────────────────────────────────────

  describe("given the Host has several upcoming Moments", () => {
    it("should return all upcoming Moments with their circle and registration data", async () => {
      const moments: HostMomentSummary[] = [
        makeHostMomentSummary({
          id: "moment-1",
          title: "JavaScript Workshop",
          registrationCount: 25,
          circle: { slug: "js-paris", name: "JS Paris", coverImage: null },
        }),
        makeHostMomentSummary({
          id: "moment-2",
          title: "Design Sprint",
          registrationCount: 8,
          locationType: "ONLINE",
          locationName: null,
          circle: {
            slug: "ux-community",
            name: "UX Community",
            coverImage: "https://example.com/cover.jpg",
          },
        }),
      ];

      const momentRepository = createMockMomentRepository({
        findUpcomingByHostUserId: vi.fn().mockResolvedValue(moments),
      });

      const result = await getHostUpcomingMoments("host-1", {
        momentRepository,
      });

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("JavaScript Workshop");
      expect(result[0].registrationCount).toBe(25);
      expect(result[0].circle.name).toBe("JS Paris");
      expect(result[1].title).toBe("Design Sprint");
      expect(result[1].locationType).toBe("ONLINE");
      expect(result[1].locationName).toBeNull();
      expect(result[1].circle.coverImage).toBe(
        "https://example.com/cover.jpg"
      );
    });
  });

  describe("given the Host has no upcoming Moments", () => {
    it("should return an empty array", async () => {
      const momentRepository = createMockMomentRepository({
        findUpcomingByHostUserId: vi.fn().mockResolvedValue([]),
      });

      const result = await getHostUpcomingMoments("host-1", {
        momentRepository,
      });

      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Contrat de délégation — propagation du hostUserId
  // ─────────────────────────────────────────────────────────────

  describe("given the hostUserId is passed to the repository", () => {
    it("should call findUpcomingByHostUserId with the correct hostUserId", async () => {
      let capturedHostUserId: string | undefined;

      const momentRepository = createMockMomentRepository({
        findUpcomingByHostUserId: vi
          .fn()
          .mockImplementation((hostUserId: string) => {
            capturedHostUserId = hostUserId;
            return Promise.resolve([]);
          }),
      });

      await getHostUpcomingMoments("host-42", { momentRepository });

      expect(capturedHostUserId).toBe("host-42");
    });

    it("should call findUpcomingByHostUserId exactly once", async () => {
      const momentRepository = createMockMomentRepository({
        findUpcomingByHostUserId: vi.fn().mockResolvedValue([]),
      });

      await getHostUpcomingMoments("host-1", { momentRepository });

      expect(momentRepository.findUpcomingByHostUserId).toHaveBeenCalledTimes(
        1
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Variantes de types de lieu
  // ─────────────────────────────────────────────────────────────

  describe("given Moments with different location types", () => {
    it.each([
      {
        label: "an in-person Moment",
        locationType: "IN_PERSON" as const,
        locationName: "Maison des associations",
      },
      {
        label: "an online Moment",
        locationType: "ONLINE" as const,
        locationName: null,
      },
      {
        label: "a hybrid Moment",
        locationType: "HYBRID" as const,
        locationName: "Salle Pleyel",
      },
    ])(
      "should return $label with its locationType and locationName intact",
      async ({ locationType, locationName }) => {
        const moments = [makeHostMomentSummary({ locationType, locationName })];
        const momentRepository = createMockMomentRepository({
          findUpcomingByHostUserId: vi.fn().mockResolvedValue(moments),
        });

        const result = await getHostUpcomingMoments("host-1", {
          momentRepository,
        });

        expect(result[0].locationType).toBe(locationType);
        expect(result[0].locationName).toBe(locationName);
      }
    );
  });

  // ─────────────────────────────────────────────────────────────
  // Contenu du HostMomentSummary — champs optionnels
  // ─────────────────────────────────────────────────────────────

  describe("given a Moment without cover image and without end date", () => {
    it("should return coverImage as null and endsAt as null", async () => {
      const moments = [
        makeHostMomentSummary({
          coverImage: null,
          endsAt: null,
        }),
      ];
      const momentRepository = createMockMomentRepository({
        findUpcomingByHostUserId: vi.fn().mockResolvedValue(moments),
      });

      const result = await getHostUpcomingMoments("host-1", {
        momentRepository,
      });

      expect(result[0].coverImage).toBeNull();
      expect(result[0].endsAt).toBeNull();
    });
  });

  describe("given a Host organising Moments across multiple Circles", () => {
    it("should return each Moment with its correct Circle metadata", async () => {
      const moments: HostMomentSummary[] = [
        makeHostMomentSummary({
          id: "moment-1",
          title: "Yoga Morning",
          circle: {
            slug: "wellness-club",
            name: "Wellness Club",
            coverImage: null,
          },
        }),
        makeHostMomentSummary({
          id: "moment-2",
          title: "Coding Dojo",
          circle: {
            slug: "dev-guild",
            name: "Dev Guild",
            coverImage: "https://cdn.example.com/dev-guild.jpg",
          },
        }),
      ];
      const momentRepository = createMockMomentRepository({
        findUpcomingByHostUserId: vi.fn().mockResolvedValue(moments),
      });

      const result = await getHostUpcomingMoments("host-1", {
        momentRepository,
      });

      expect(result[0].circle.slug).toBe("wellness-club");
      expect(result[0].circle.name).toBe("Wellness Club");
      expect(result[1].circle.slug).toBe("dev-guild");
      expect(result[1].circle.coverImage).toBe(
        "https://cdn.example.com/dev-guild.jpg"
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Sécurité — Isolation multi-tenant (IDOR)
  //
  // Ce usecase est côté Organisateur. Le hostUserId provient de
  // la session (couche app), jamais d'un paramètre utilisateur.
  // Ces tests vérifient que le usecase ne substitue pas le userId
  // et qu'un appel pour un Host ne contamine pas un autre Host.
  // ─────────────────────────────────────────────────────────────

  describe("Security — multi-tenant isolation (IDOR)", () => {
    it("should call findUpcomingByHostUserId with the exact userId provided — no substitution", async () => {
      const momentRepository = createMockMomentRepository({
        findUpcomingByHostUserId: vi.fn().mockResolvedValue([]),
      });

      await getHostUpcomingMoments("host-alice", { momentRepository });

      expect(momentRepository.findUpcomingByHostUserId).toHaveBeenCalledWith(
        "host-alice"
      );
      expect(
        momentRepository.findUpcomingByHostUserId
      ).not.toHaveBeenCalledWith("host-victim");
    });

    it("should NOT expose Moments of another Host", async () => {
      const aliceMoments: HostMomentSummary[] = [
        makeHostMomentSummary({ id: "moment-alice", title: "Alice Event" }),
      ];

      const momentRepository = createMockMomentRepository({
        findUpcomingByHostUserId: vi
          .fn()
          .mockImplementation((hostUserId: string) => {
            if (hostUserId === "host-alice")
              return Promise.resolve(aliceMoments);
            return Promise.resolve([]);
          }),
      });

      const aliceResult = await getHostUpcomingMoments("host-alice", {
        momentRepository,
      });
      const bobResult = await getHostUpcomingMoments("host-bob", {
        momentRepository,
      });

      expect(aliceResult).toHaveLength(1);
      expect(aliceResult[0].title).toBe("Alice Event");
      expect(bobResult).toHaveLength(0);
    });

    it("should propagate distinct hostUserIds correctly for concurrent calls — no cross-contamination", async () => {
      const calls: string[] = [];

      const momentRepository = createMockMomentRepository({
        findUpcomingByHostUserId: vi
          .fn()
          .mockImplementation((hostUserId: string) => {
            calls.push(hostUserId);
            return Promise.resolve([]);
          }),
      });

      await Promise.all([
        getHostUpcomingMoments("host-alice", { momentRepository }),
        getHostUpcomingMoments("host-bob", { momentRepository }),
        getHostUpcomingMoments("host-carol", { momentRepository }),
      ]);

      expect(calls.filter((id) => id === "host-alice")).toHaveLength(1);
      expect(calls.filter((id) => id === "host-bob")).toHaveLength(1);
      expect(calls.filter((id) => id === "host-carol")).toHaveLength(1);
      expect(calls).toHaveLength(3);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Comportement en cas d'erreur du repository
  // ─────────────────────────────────────────────────────────────

  describe("given the repository throws an error", () => {
    it("should propagate the error to the caller", async () => {
      const dbError = new Error("Database connection lost");
      const momentRepository = createMockMomentRepository({
        findUpcomingByHostUserId: vi.fn().mockRejectedValue(dbError),
      });

      await expect(
        getHostUpcomingMoments("host-1", { momentRepository })
      ).rejects.toThrow("Database connection lost");
    });
  });
});

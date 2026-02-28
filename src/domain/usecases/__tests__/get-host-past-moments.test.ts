import { describe, it, expect, vi } from "vitest";
import { getHostPastMoments } from "@/domain/usecases/get-host-past-moments";
import { createMockMomentRepository } from "./helpers/mock-moment-repository";
import type { HostMomentSummary } from "@/domain/models/moment";

function makeHostMomentSummary(
  overrides: Partial<HostMomentSummary> = {}
): HostMomentSummary {
  return {
    id: "moment-1",
    slug: "past-meetup",
    title: "Past Meetup",
    coverImage: null,
    startsAt: new Date("2026-01-10T18:00:00Z"),
    endsAt: new Date("2026-01-10T20:00:00Z"),
    locationType: "IN_PERSON",
    locationName: "Café Central",
    status: "PAST",
    registrationCount: 30,
    circle: {
      slug: "tech-paris",
      name: "Tech Paris",
      coverImage: null,
    },
    ...overrides,
  };
}

describe("GetHostPastMoments", () => {
  // ─────────────────────────────────────────────────────────────
  // Happy paths
  // ─────────────────────────────────────────────────────────────

  describe("given the Host has several past Moments", () => {
    it("should return all past Moments with their circle and registration data", async () => {
      const moments: HostMomentSummary[] = [
        makeHostMomentSummary({
          id: "moment-1",
          title: "React Conference",
          status: "PAST",
          registrationCount: 80,
          circle: {
            slug: "react-community",
            name: "React Community",
            coverImage: null,
          },
        }),
        makeHostMomentSummary({
          id: "moment-2",
          title: "Annulé Workshop",
          status: "CANCELLED",
          registrationCount: 5,
          locationType: "ONLINE",
          locationName: null,
          circle: {
            slug: "design-guild",
            name: "Design Guild",
            coverImage: "https://example.com/design.jpg",
          },
        }),
      ];

      const momentRepository = createMockMomentRepository({
        findPastByHostUserId: vi.fn().mockResolvedValue(moments),
      });

      const result = await getHostPastMoments("host-1", { momentRepository });

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("React Conference");
      expect(result[0].status).toBe("PAST");
      expect(result[0].registrationCount).toBe(80);
      expect(result[0].circle.name).toBe("React Community");
      expect(result[1].title).toBe("Annulé Workshop");
      expect(result[1].status).toBe("CANCELLED");
      expect(result[1].locationType).toBe("ONLINE");
      expect(result[1].locationName).toBeNull();
      expect(result[1].circle.coverImage).toBe(
        "https://example.com/design.jpg"
      );
    });
  });

  describe("given the Host has no past Moments", () => {
    it("should return an empty array", async () => {
      const momentRepository = createMockMomentRepository({
        findPastByHostUserId: vi.fn().mockResolvedValue([]),
      });

      const result = await getHostPastMoments("host-1", { momentRepository });

      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Contrat de délégation — propagation du hostUserId
  // ─────────────────────────────────────────────────────────────

  describe("given the hostUserId is passed to the repository", () => {
    it("should call findPastByHostUserId with the correct hostUserId", async () => {
      let capturedHostUserId: string | undefined;

      const momentRepository = createMockMomentRepository({
        findPastByHostUserId: vi
          .fn()
          .mockImplementation((hostUserId: string) => {
            capturedHostUserId = hostUserId;
            return Promise.resolve([]);
          }),
      });

      await getHostPastMoments("host-99", { momentRepository });

      expect(capturedHostUserId).toBe("host-99");
    });

    it("should call findPastByHostUserId exactly once", async () => {
      const momentRepository = createMockMomentRepository({
        findPastByHostUserId: vi.fn().mockResolvedValue([]),
      });

      await getHostPastMoments("host-1", { momentRepository });

      expect(momentRepository.findPastByHostUserId).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Statuts de Moment passé — PAST vs CANCELLED
  //
  // Les Moments passés peuvent avoir le statut PAST (déroulés)
  // ou CANCELLED (annulés). Le usecase ne filtre pas par statut —
  // il délègue entièrement au repository.
  // ─────────────────────────────────────────────────────────────

  describe("given Moments with different past statuses", () => {
    it.each([
      { label: "a PAST Moment", status: "PAST" as const },
      { label: "a CANCELLED Moment", status: "CANCELLED" as const },
    ])(
      "should return $label with its status intact",
      async ({ status }) => {
        const moments = [makeHostMomentSummary({ status })];
        const momentRepository = createMockMomentRepository({
          findPastByHostUserId: vi.fn().mockResolvedValue(moments),
        });

        const result = await getHostPastMoments("host-1", { momentRepository });

        expect(result[0].status).toBe(status);
      }
    );
  });

  // ─────────────────────────────────────────────────────────────
  // Variantes de types de lieu
  // ─────────────────────────────────────────────────────────────

  describe("given past Moments with different location types", () => {
    it.each([
      {
        label: "an in-person past Moment",
        locationType: "IN_PERSON" as const,
        locationName: "Amphithéâtre Richelieu",
      },
      {
        label: "an online past Moment",
        locationType: "ONLINE" as const,
        locationName: null,
      },
      {
        label: "a hybrid past Moment",
        locationType: "HYBRID" as const,
        locationName: "Hôtel de Ville",
      },
    ])(
      "should return $label with its locationType and locationName intact",
      async ({ locationType, locationName }) => {
        const moments = [makeHostMomentSummary({ locationType, locationName })];
        const momentRepository = createMockMomentRepository({
          findPastByHostUserId: vi.fn().mockResolvedValue(moments),
        });

        const result = await getHostPastMoments("host-1", { momentRepository });

        expect(result[0].locationType).toBe(locationType);
        expect(result[0].locationName).toBe(locationName);
      }
    );
  });

  // ─────────────────────────────────────────────────────────────
  // Champs optionnels du HostMomentSummary
  // ─────────────────────────────────────────────────────────────

  describe("given a past Moment without cover image and without end date", () => {
    it("should return coverImage as null and endsAt as null", async () => {
      const moments = [
        makeHostMomentSummary({
          coverImage: null,
          endsAt: null,
        }),
      ];
      const momentRepository = createMockMomentRepository({
        findPastByHostUserId: vi.fn().mockResolvedValue(moments),
      });

      const result = await getHostPastMoments("host-1", { momentRepository });

      expect(result[0].coverImage).toBeNull();
      expect(result[0].endsAt).toBeNull();
    });
  });

  describe("given a Host with high attendance in a past Moment", () => {
    it("should return the correct registrationCount", async () => {
      const moments = [makeHostMomentSummary({ registrationCount: 250 })];
      const momentRepository = createMockMomentRepository({
        findPastByHostUserId: vi.fn().mockResolvedValue(moments),
      });

      const result = await getHostPastMoments("host-1", { momentRepository });

      expect(result[0].registrationCount).toBe(250);
    });
  });

  describe("given a Host organising past Moments across multiple Circles", () => {
    it("should return each Moment with its correct Circle metadata", async () => {
      const moments: HostMomentSummary[] = [
        makeHostMomentSummary({
          id: "moment-1",
          title: "Yoga Retreat",
          circle: {
            slug: "wellness-circle",
            name: "Wellness Circle",
            coverImage: null,
          },
        }),
        makeHostMomentSummary({
          id: "moment-2",
          title: "Hackathon",
          circle: {
            slug: "makers-club",
            name: "Makers Club",
            coverImage: "https://cdn.example.com/makers.jpg",
          },
        }),
      ];
      const momentRepository = createMockMomentRepository({
        findPastByHostUserId: vi.fn().mockResolvedValue(moments),
      });

      const result = await getHostPastMoments("host-1", { momentRepository });

      expect(result[0].circle.slug).toBe("wellness-circle");
      expect(result[0].circle.name).toBe("Wellness Circle");
      expect(result[1].circle.slug).toBe("makers-club");
      expect(result[1].circle.coverImage).toBe(
        "https://cdn.example.com/makers.jpg"
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Sécurité — Isolation multi-tenant (IDOR)
  //
  // Le hostUserId provient de la session (couche app), jamais d'un
  // paramètre contrôlé par l'utilisateur.
  // Ces tests vérifient que le usecase ne substitue pas le userId
  // et qu'un appel pour un Host ne contamine pas un autre Host.
  // ─────────────────────────────────────────────────────────────

  describe("Security — multi-tenant isolation (IDOR)", () => {
    it("should call findPastByHostUserId with the exact userId provided — no substitution", async () => {
      const momentRepository = createMockMomentRepository({
        findPastByHostUserId: vi.fn().mockResolvedValue([]),
      });

      await getHostPastMoments("host-alice", { momentRepository });

      expect(momentRepository.findPastByHostUserId).toHaveBeenCalledWith(
        "host-alice"
      );
      expect(momentRepository.findPastByHostUserId).not.toHaveBeenCalledWith(
        "host-victim"
      );
    });

    it("should NOT expose past Moments of another Host", async () => {
      const aliceMoments: HostMomentSummary[] = [
        makeHostMomentSummary({
          id: "moment-alice",
          title: "Alice Past Event",
          status: "PAST",
        }),
      ];

      const momentRepository = createMockMomentRepository({
        findPastByHostUserId: vi
          .fn()
          .mockImplementation((hostUserId: string) => {
            if (hostUserId === "host-alice")
              return Promise.resolve(aliceMoments);
            return Promise.resolve([]);
          }),
      });

      const aliceResult = await getHostPastMoments("host-alice", {
        momentRepository,
      });
      const bobResult = await getHostPastMoments("host-bob", {
        momentRepository,
      });

      expect(aliceResult).toHaveLength(1);
      expect(aliceResult[0].title).toBe("Alice Past Event");
      expect(bobResult).toHaveLength(0);
    });

    it("should propagate distinct hostUserIds correctly for concurrent calls — no cross-contamination", async () => {
      const calls: string[] = [];

      const momentRepository = createMockMomentRepository({
        findPastByHostUserId: vi
          .fn()
          .mockImplementation((hostUserId: string) => {
            calls.push(hostUserId);
            return Promise.resolve([]);
          }),
      });

      await Promise.all([
        getHostPastMoments("host-alice", { momentRepository }),
        getHostPastMoments("host-bob", { momentRepository }),
        getHostPastMoments("host-carol", { momentRepository }),
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
        findPastByHostUserId: vi.fn().mockRejectedValue(dbError),
      });

      await expect(
        getHostPastMoments("host-1", { momentRepository })
      ).rejects.toThrow("Database connection lost");
    });
  });
});

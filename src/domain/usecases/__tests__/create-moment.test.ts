import { describe, it, expect, vi } from "vitest";
import { createMoment } from "@/domain/usecases/create-moment";
import {
  MomentSlugAlreadyExistsError,
  UnauthorizedMomentActionError,
} from "@/domain/errors";
import {
  createMockMomentRepository,
  makeMoment,
} from "./helpers/mock-moment-repository";
import {
  createMockCircleRepository,
  makeMembership,
} from "./helpers/mock-circle-repository";

describe("CreateMoment", () => {
  const defaultInput = {
    circleId: "circle-1",
    userId: "user-1",
    title: "Weekly Meetup",
    description: "A weekly community meetup",
    startsAt: new Date("2026-03-01T18:00:00Z"),
    endsAt: new Date("2026-03-01T20:00:00Z"),
    locationType: "IN_PERSON" as const,
    locationName: "Cafe Central",
    locationAddress: "123 Main Street, Paris",
    videoLink: null,
    capacity: 30,
    price: 0,
    currency: "EUR",
  };

  describe("given a HOST user with valid input", () => {
    it("should create the Moment with a generated slug in DRAFT status", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
      });
      const momentRepo = createMockMomentRepository({
        create: vi.fn().mockResolvedValue(
          makeMoment({ title: "Weekly Meetup", slug: "weekly-meetup", status: "DRAFT" })
        ),
      });

      const result = await createMoment(defaultInput, {
        momentRepository: momentRepo,
        circleRepository: circleRepo,
      });

      expect(momentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Weekly Meetup",
          slug: "weekly-meetup",
          circleId: "circle-1",
          createdById: "user-1",
          status: "DRAFT",
        })
      );
      expect(result.moment.title).toBe("Weekly Meetup");
      expect(result.moment.status).toBe("DRAFT");
    });

    it("should verify HOST membership on the Circle", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
      });
      const momentRepo = createMockMomentRepository();

      await createMoment(defaultInput, {
        momentRepository: momentRepo,
        circleRepository: circleRepo,
      });

      expect(circleRepo.findMembership).toHaveBeenCalledWith(
        "circle-1",
        "user-1",
        "HOST"
      );
    });
  });

  describe("given a user who is not HOST of the Circle", () => {
    it("should throw UnauthorizedMomentActionError", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      });
      const momentRepo = createMockMomentRepository();

      await expect(
        createMoment(defaultInput, {
          momentRepository: momentRepo,
          circleRepository: circleRepo,
        })
      ).rejects.toThrow(UnauthorizedMomentActionError);
    });
  });

  describe("given a title whose slug already exists", () => {
    it("should append a suffix to make the slug unique", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
      });
      const momentRepo = createMockMomentRepository({
        slugExists: vi
          .fn()
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(false),
        create: vi.fn().mockImplementation((input) =>
          Promise.resolve(makeMoment({ slug: input.slug }))
        ),
      });

      const result = await createMoment(defaultInput, {
        momentRepository: momentRepo,
        circleRepository: circleRepo,
      });

      expect(result.moment.slug).toMatch(/^weekly-meetup-[a-z0-9]+$/);
    });

    it("should throw MomentSlugAlreadyExistsError if suffixed slug also exists", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
      });
      const momentRepo = createMockMomentRepository({
        slugExists: vi.fn().mockResolvedValue(true),
      });

      await expect(
        createMoment(defaultInput, {
          momentRepository: momentRepo,
          circleRepository: circleRepo,
        })
      ).rejects.toThrow(MomentSlugAlreadyExistsError);
    });
  });
});

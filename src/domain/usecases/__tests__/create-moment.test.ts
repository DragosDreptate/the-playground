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
import { createMockRegistrationRepository } from "./helpers/mock-registration-repository";

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
    it("should create the Moment with a generated slug in PUBLISHED status", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
      });
      const momentRepo = createMockMomentRepository({
        create: vi.fn().mockResolvedValue(
          makeMoment({ title: "Weekly Meetup", slug: "weekly-meetup", status: "PUBLISHED" })
        ),
      });
      const registrationRepo = createMockRegistrationRepository();

      const result = await createMoment(defaultInput, {
        momentRepository: momentRepo,
        circleRepository: circleRepo,
        registrationRepository: registrationRepo,
      });

      expect(momentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Weekly Meetup",
          slug: "weekly-meetup",
          circleId: "circle-1",
          createdById: "user-1",
          status: "PUBLISHED",
        })
      );
      expect(result.moment.title).toBe("Weekly Meetup");
      expect(result.moment.status).toBe("PUBLISHED");
    });

    it("should automatically register the Host as a Participant", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
      });
      const momentRepo = createMockMomentRepository({
        create: vi.fn().mockResolvedValue(makeMoment({ id: "moment-1" })),
      });
      const registrationRepo = createMockRegistrationRepository();

      await createMoment(defaultInput, {
        momentRepository: momentRepo,
        circleRepository: circleRepo,
        registrationRepository: registrationRepo,
      });

      expect(registrationRepo.create).toHaveBeenCalledWith({
        momentId: "moment-1",
        userId: "user-1",
        status: "REGISTERED",
      });
    });

    it("should verify HOST membership on the Circle", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
      });
      const momentRepo = createMockMomentRepository();
      const registrationRepo = createMockRegistrationRepository();

      await createMoment(defaultInput, {
        momentRepository: momentRepo,
        circleRepository: circleRepo,
        registrationRepository: registrationRepo,
      });

      expect(circleRepo.findMembership).toHaveBeenCalledWith("circle-1", "user-1");
    });
  });

  describe("given a user who is not a member of the Circle", () => {
    it("should throw UnauthorizedMomentActionError", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      });
      const momentRepo = createMockMomentRepository();
      const registrationRepo = createMockRegistrationRepository();

      await expect(
        createMoment(defaultInput, {
          momentRepository: momentRepo,
          circleRepository: circleRepo,
          registrationRepository: registrationRepo,
        })
      ).rejects.toThrow(UnauthorizedMomentActionError);
    });
  });

  describe("given a user who is PLAYER (not HOST) of the Circle", () => {
    it("should throw UnauthorizedMomentActionError", async () => {
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "PLAYER" })),
      });
      const momentRepo = createMockMomentRepository();
      const registrationRepo = createMockRegistrationRepository();

      await expect(
        createMoment(defaultInput, {
          momentRepository: momentRepo,
          circleRepository: circleRepo,
          registrationRepository: registrationRepo,
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
      const registrationRepo = createMockRegistrationRepository();

      const result = await createMoment(defaultInput, {
        momentRepository: momentRepo,
        circleRepository: circleRepo,
        registrationRepository: registrationRepo,
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
      const registrationRepo = createMockRegistrationRepository();

      await expect(
        createMoment(defaultInput, {
          momentRepository: momentRepo,
          circleRepository: circleRepo,
          registrationRepository: registrationRepo,
        })
      ).rejects.toThrow(MomentSlugAlreadyExistsError);
    });
  });
});

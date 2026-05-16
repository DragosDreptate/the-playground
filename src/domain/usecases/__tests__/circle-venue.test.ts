import { describe, expect, it, vi } from "vitest";
import { createCircleVenue } from "@/domain/usecases/create-circle-venue";
import { updateCircleVenue } from "@/domain/usecases/update-circle-venue";
import { deleteCircleVenue } from "@/domain/usecases/delete-circle-venue";
import { listCircleVenues } from "@/domain/usecases/list-circle-venues";
import {
  CircleNotFoundError,
  CircleVenueNotFoundError,
  UnauthorizedCircleActionError,
} from "@/domain/errors";
import {
  createMockCircleRepository,
  makeCircle,
  makeMembership,
} from "./helpers/mock-circle-repository";
import {
  createMockCircleVenueRepository,
  makeCircleVenue,
} from "./helpers/mock-circle-venue-repository";

describe("CircleVenue use cases", () => {
  it("allows an active organizer to create a venue", async () => {
    const circleRepo = createMockCircleRepository({
      findById: vi.fn().mockResolvedValue(makeCircle()),
      findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "CO_HOST" })),
    });
    const venueRepo = createMockCircleVenueRepository();

    const result = await createCircleVenue(
      {
        circleId: "circle-1",
        userId: "user-1",
        name: "La Base",
        address: "10 rue Oberkampf, Paris",
      },
      { circleRepository: circleRepo, circleVenueRepository: venueRepo }
    );

    expect(result.id).toBe("venue-1");
    expect(venueRepo.create).toHaveBeenCalledWith({
      circleId: "circle-1",
      name: "La Base",
      address: "10 rue Oberkampf, Paris",
    });
  });

  it("rejects venue creation when the user is not an organizer", async () => {
    const circleRepo = createMockCircleRepository({
      findById: vi.fn().mockResolvedValue(makeCircle()),
      findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "PLAYER" })),
    });
    const venueRepo = createMockCircleVenueRepository();

    await expect(
      createCircleVenue(
        {
          circleId: "circle-1",
          userId: "user-1",
          name: "La Base",
          address: "10 rue Oberkampf, Paris",
        },
        { circleRepository: circleRepo, circleVenueRepository: venueRepo }
      )
    ).rejects.toBeInstanceOf(UnauthorizedCircleActionError);
  });

  it("throws when listing venues for a missing circle", async () => {
    const circleRepo = createMockCircleRepository({
      findById: vi.fn().mockResolvedValue(null),
    });
    const venueRepo = createMockCircleVenueRepository();

    await expect(
      listCircleVenues(
        { circleId: "missing", userId: "user-1" },
        { circleRepository: circleRepo, circleVenueRepository: venueRepo }
      )
    ).rejects.toBeInstanceOf(CircleNotFoundError);
  });

  it("updates only a venue that belongs to the requested circle", async () => {
    const circleRepo = createMockCircleRepository({
      findById: vi.fn().mockResolvedValue(makeCircle()),
      findMembership: vi.fn().mockResolvedValue(makeMembership()),
    });
    const venueRepo = createMockCircleVenueRepository({
      findById: vi.fn().mockResolvedValue(makeCircleVenue({ circleId: "other-circle" })),
    });

    await expect(
      updateCircleVenue(
        {
          circleId: "circle-1",
          venueId: "venue-1",
          userId: "user-1",
          name: "Updated",
          address: "Updated address",
        },
        { circleRepository: circleRepo, circleVenueRepository: venueRepo }
      )
    ).rejects.toBeInstanceOf(CircleVenueNotFoundError);
  });

  it("deletes only a venue that belongs to the requested circle", async () => {
    const circleRepo = createMockCircleRepository({
      findById: vi.fn().mockResolvedValue(makeCircle()),
      findMembership: vi.fn().mockResolvedValue(makeMembership()),
    });
    const venueRepo = createMockCircleVenueRepository({
      findById: vi.fn().mockResolvedValue(makeCircleVenue({ circleId: "circle-1" })),
    });

    await deleteCircleVenue(
      { circleId: "circle-1", venueId: "venue-1", userId: "user-1" },
      { circleRepository: circleRepo, circleVenueRepository: venueRepo }
    );

    expect(venueRepo.delete).toHaveBeenCalledWith("venue-1");
  });

});

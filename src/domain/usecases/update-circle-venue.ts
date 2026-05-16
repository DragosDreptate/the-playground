import { isActiveOrganizer } from "@/domain/models/circle";
import type { CircleVenue } from "@/domain/models/circle-venue";
import {
  CircleNotFoundError,
  CircleVenueNotFoundError,
  UnauthorizedCircleActionError,
} from "@/domain/errors";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { CircleVenueRepository } from "@/domain/ports/repositories/circle-venue-repository";

type UpdateCircleVenueInput = {
  circleId: string;
  venueId: string;
  userId: string;
  name?: string;
  address?: string;
};

type UpdateCircleVenueDeps = {
  circleRepository: CircleRepository;
  circleVenueRepository: CircleVenueRepository;
};

export async function updateCircleVenue(
  input: UpdateCircleVenueInput,
  deps: UpdateCircleVenueDeps
): Promise<CircleVenue> {
  const circle = await deps.circleRepository.findById(input.circleId);
  if (!circle) {
    throw new CircleNotFoundError(input.circleId);
  }

  const venue = await deps.circleVenueRepository.findById(input.venueId);
  if (!venue || venue.circleId !== input.circleId) {
    throw new CircleVenueNotFoundError(input.venueId);
  }

  const membership = await deps.circleRepository.findMembership(
    input.circleId,
    input.userId
  );
  if (!isActiveOrganizer(membership)) {
    throw new UnauthorizedCircleActionError(input.userId, input.circleId);
  }

  return deps.circleVenueRepository.update(input.venueId, {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.address !== undefined && { address: input.address }),
  });
}

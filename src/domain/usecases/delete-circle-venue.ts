import { isActiveOrganizer } from "@/domain/models/circle";
import {
  CircleNotFoundError,
  CircleVenueNotFoundError,
  UnauthorizedCircleActionError,
} from "@/domain/errors";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { CircleVenueRepository } from "@/domain/ports/repositories/circle-venue-repository";

type DeleteCircleVenueInput = {
  circleId: string;
  venueId: string;
  userId: string;
};

type DeleteCircleVenueDeps = {
  circleRepository: CircleRepository;
  circleVenueRepository: CircleVenueRepository;
};

export async function deleteCircleVenue(
  input: DeleteCircleVenueInput,
  deps: DeleteCircleVenueDeps
): Promise<void> {
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

  await deps.circleVenueRepository.delete(input.venueId);
}

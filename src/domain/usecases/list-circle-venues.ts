import { isActiveOrganizer } from "@/domain/models/circle";
import type { CircleVenue } from "@/domain/models/circle-venue";
import { CircleNotFoundError, UnauthorizedCircleActionError } from "@/domain/errors";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { CircleVenueRepository } from "@/domain/ports/repositories/circle-venue-repository";

type ListCircleVenuesInput = {
  circleId: string;
  userId: string;
};

type ListCircleVenuesDeps = {
  circleRepository: CircleRepository;
  circleVenueRepository: CircleVenueRepository;
};

export async function listCircleVenues(
  input: ListCircleVenuesInput,
  deps: ListCircleVenuesDeps
): Promise<CircleVenue[]> {
  const circle = await deps.circleRepository.findById(input.circleId);
  if (!circle) {
    throw new CircleNotFoundError(input.circleId);
  }

  const membership = await deps.circleRepository.findMembership(
    input.circleId,
    input.userId
  );
  if (!isActiveOrganizer(membership)) {
    throw new UnauthorizedCircleActionError(input.userId, input.circleId);
  }

  return deps.circleVenueRepository.findByCircleId(input.circleId);
}

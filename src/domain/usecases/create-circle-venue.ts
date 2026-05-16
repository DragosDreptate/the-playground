import { isActiveOrganizer } from "@/domain/models/circle";
import type { CircleVenue } from "@/domain/models/circle-venue";
import { CircleNotFoundError, UnauthorizedCircleActionError } from "@/domain/errors";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { CircleVenueRepository } from "@/domain/ports/repositories/circle-venue-repository";

type CreateCircleVenueInput = {
  circleId: string;
  userId: string;
  name: string;
  address: string;
};

type CreateCircleVenueDeps = {
  circleRepository: CircleRepository;
  circleVenueRepository: CircleVenueRepository;
};

export async function createCircleVenue(
  input: CreateCircleVenueInput,
  deps: CreateCircleVenueDeps
): Promise<CircleVenue> {
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

  return deps.circleVenueRepository.create({
    circleId: input.circleId,
    name: input.name,
    address: input.address,
  });
}

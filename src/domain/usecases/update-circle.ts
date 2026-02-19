import type { Circle, CircleVisibility } from "@/domain/models/circle";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import { CircleNotFoundError, UnauthorizedCircleActionError } from "@/domain/errors";

type UpdateCircleInput = {
  circleId: string;
  userId: string;
  name?: string;
  description?: string;
  visibility?: CircleVisibility;
};

type UpdateCircleDeps = {
  circleRepository: CircleRepository;
};

type UpdateCircleResult = {
  circle: Circle;
};

export async function updateCircle(
  input: UpdateCircleInput,
  deps: UpdateCircleDeps
): Promise<UpdateCircleResult> {
  const { circleRepository } = deps;

  const circle = await circleRepository.findById(input.circleId);
  if (!circle) {
    throw new CircleNotFoundError(input.circleId);
  }

  const membership = await circleRepository.findMembership(
    input.circleId,
    input.userId,
    "HOST"
  );
  if (!membership) {
    throw new UnauthorizedCircleActionError(input.userId, input.circleId);
  }

  const updated = await circleRepository.update(input.circleId, {
    name: input.name,
    description: input.description,
    visibility: input.visibility,
  });

  return { circle: updated };
}

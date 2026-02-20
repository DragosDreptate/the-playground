import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import { CircleNotFoundError, UnauthorizedCircleActionError } from "@/domain/errors";

type DeleteCircleInput = {
  circleId: string;
  userId: string;
};

type DeleteCircleDeps = {
  circleRepository: CircleRepository;
};

export async function deleteCircle(
  input: DeleteCircleInput,
  deps: DeleteCircleDeps
): Promise<void> {
  const { circleRepository } = deps;

  const circle = await circleRepository.findById(input.circleId);
  if (!circle) {
    throw new CircleNotFoundError(input.circleId);
  }

  const membership = await circleRepository.findMembership(
    input.circleId,
    input.userId
  );
  if (!membership || membership.role !== "HOST") {
    throw new UnauthorizedCircleActionError(input.userId, input.circleId);
  }

  await circleRepository.delete(input.circleId);
}

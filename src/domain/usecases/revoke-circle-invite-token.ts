import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import { CircleNotFoundError, UnauthorizedCircleActionError } from "@/domain/errors/circle-errors";

type Input = {
  circleId: string;
  userId: string;
};

type Deps = {
  circleRepository: CircleRepository;
};

export async function revokeCircleInviteToken(
  input: Input,
  deps: Deps
): Promise<void> {
  const { circleId, userId } = input;
  const { circleRepository } = deps;

  const circle = await circleRepository.findById(circleId);
  if (!circle) throw new CircleNotFoundError(circleId);

  const membership = await circleRepository.findMembership(circleId, userId);
  if (!membership || membership.role !== "HOST" || membership.status !== "ACTIVE") {
    throw new UnauthorizedCircleActionError(userId, circleId);
  }

  await circleRepository.update(circleId, { inviteToken: null });
}

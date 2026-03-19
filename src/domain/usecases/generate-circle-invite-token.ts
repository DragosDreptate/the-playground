import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { Circle } from "@/domain/models/circle";
import { CircleNotFoundError, UnauthorizedCircleActionError } from "@/domain/errors/circle-errors";

type Input = {
  circleId: string;
  userId: string;
};

type Deps = {
  circleRepository: CircleRepository;
};

type Output = {
  circle: Circle;
  token: string;
};

export async function generateCircleInviteToken(
  input: Input,
  deps: Deps
): Promise<Output> {
  const { circleId, userId } = input;
  const { circleRepository } = deps;

  const circle = await circleRepository.findById(circleId);
  if (!circle) throw new CircleNotFoundError(circleId);

  const membership = await circleRepository.findMembership(circleId, userId);
  if (!membership || membership.role !== "HOST" || membership.status !== "ACTIVE") {
    throw new UnauthorizedCircleActionError(userId, circleId);
  }

  // Return existing token if already set (idempotent)
  if (circle.inviteToken) {
    return { circle, token: circle.inviteToken };
  }

  const token = crypto.randomUUID();
  const updated = await circleRepository.update(circleId, { inviteToken: token });

  return { circle: updated, token };
}

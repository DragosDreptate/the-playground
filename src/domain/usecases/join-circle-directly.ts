import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { CircleMembership } from "@/domain/models/circle";
import { CircleNotFoundError } from "@/domain/errors";

type Input = {
  circleId: string;
  userId: string;
};

type Deps = {
  circleRepository: CircleRepository;
};

type Output = {
  membership: CircleMembership;
  alreadyMember: boolean;
};

export async function joinCircleDirectly(
  input: Input,
  deps: Deps
): Promise<Output> {
  const { circleId, userId } = input;
  const { circleRepository } = deps;

  const circle = await circleRepository.findById(circleId);
  if (!circle) throw new CircleNotFoundError(circleId);

  const existing = await circleRepository.findMembership(circleId, userId);
  if (existing) {
    return { membership: existing, alreadyMember: true };
  }

  const membership = await circleRepository.addMembership(circleId, userId, "PLAYER");
  return { membership, alreadyMember: false };
}

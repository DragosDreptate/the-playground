import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { Circle } from "@/domain/models/circle";
import { InvalidInviteTokenError } from "@/domain/errors/circle-errors";

type Input = {
  token: string;
  userId: string;
};

type Deps = {
  circleRepository: CircleRepository;
};

type Output = {
  circle: Circle;
  alreadyMember: boolean;
};

export async function joinCircleByInvite(
  input: Input,
  deps: Deps
): Promise<Output> {
  const { token, userId } = input;
  const { circleRepository } = deps;

  const circle = await circleRepository.findByInviteToken(token);
  if (!circle) throw new InvalidInviteTokenError();

  const membership = await circleRepository.findMembership(circle.id, userId);
  if (membership) {
    return { circle, alreadyMember: true };
  }

  await circleRepository.addMembership(circle.id, userId, "PLAYER");

  return { circle, alreadyMember: false };
}

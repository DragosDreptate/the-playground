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
  pendingApproval: boolean;
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

  // Already ACTIVE member
  if (membership && membership.status === "ACTIVE") {
    return { circle, alreadyMember: true, pendingApproval: false };
  }

  // Already PENDING
  if (membership && membership.status === "PENDING") {
    return { circle, alreadyMember: false, pendingApproval: true };
  }

  // New membership
  const status = circle.requiresApproval ? "PENDING" : "ACTIVE";
  await circleRepository.addMembership(circle.id, userId, "PLAYER", status);

  return {
    circle,
    alreadyMember: false,
    pendingApproval: status === "PENDING",
  };
}

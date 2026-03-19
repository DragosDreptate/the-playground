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
  pendingApproval: boolean;
};

export async function joinCircleDirectly(
  input: Input,
  deps: Deps
): Promise<Output> {
  const { circleId, userId } = input;
  const { circleRepository } = deps;

  const [circle, existing] = await Promise.all([
    circleRepository.findById(circleId),
    circleRepository.findMembership(circleId, userId),
  ]);
  if (!circle) throw new CircleNotFoundError(circleId);

  // Already member (ACTIVE) → return as already member
  if (existing && existing.status === "ACTIVE") {
    return { membership: existing, alreadyMember: true, pendingApproval: false };
  }

  // Already PENDING → return as pending
  if (existing && existing.status === "PENDING") {
    return { membership: existing, alreadyMember: false, pendingApproval: true };
  }

  // New membership
  const status = circle.requiresApproval ? "PENDING" : "ACTIVE";
  const membership = await circleRepository.addMembership(circleId, userId, "PLAYER", status);
  return {
    membership,
    alreadyMember: false,
    pendingApproval: status === "PENDING",
  };
}

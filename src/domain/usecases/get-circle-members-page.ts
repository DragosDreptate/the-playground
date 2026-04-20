import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { CircleMemberWithUser } from "@/domain/models/circle";
import { CircleNotFoundError, UnauthorizedCircleActionError } from "@/domain/errors";

export type GetCircleMembersPageDeps = {
  circleRepository: CircleRepository;
};

export type GetCircleMembersPageInput = {
  circleId: string;
  offset: number;
  limit: number;
  callerUserId: string | null;
};

export type GetCircleMembersPageResult = {
  members: CircleMemberWithUser[];
  total: number;
  hasMore: boolean;
};

/**
 * Liste paginée des membres d'un Circle avec tri "user courant d'abord".
 * Règle d'accès : utilisateur authentifié ET (Circle PUBLIC OU membre ACTIF).
 */
export async function getCircleMembersPage(
  input: GetCircleMembersPageInput,
  deps: GetCircleMembersPageDeps,
): Promise<GetCircleMembersPageResult> {
  const { circleId, offset, limit, callerUserId } = input;

  if (!callerUserId) {
    throw new UnauthorizedCircleActionError("anonymous", circleId);
  }

  const circle = await deps.circleRepository.findById(circleId);
  if (!circle) throw new CircleNotFoundError(circleId);

  if (circle.visibility !== "PUBLIC") {
    const membership = await deps.circleRepository.findMembership(circleId, callerUserId);
    if (membership?.status !== "ACTIVE") {
      throw new UnauthorizedCircleActionError(callerUserId, circleId);
    }
  }

  return deps.circleRepository.findMembersPaginated(circleId, {
    offset,
    limit,
    priorityUserId: callerUserId,
  });
}

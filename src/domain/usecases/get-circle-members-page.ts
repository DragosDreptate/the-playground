import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { CircleMemberWithUser } from "@/domain/models/circle";
import { isActiveOrganizer, visibleMembersFor } from "@/domain/models/circle";
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

  // Le rôle est toujours chargé : il conditionne l'accès (Circle privé) ET la
  // redaction PII (seul l'Organisateur reçoit l'email des membres).
  const membership = await deps.circleRepository.findMembership(circleId, callerUserId);

  if (circle.visibility !== "PUBLIC" && membership?.status !== "ACTIVE") {
    throw new UnauthorizedCircleActionError(callerUserId, circleId);
  }

  const page = await deps.circleRepository.findMembersPaginated(circleId, {
    offset,
    limit,
    priorityUserId: callerUserId,
  });

  // Un non-Organisateur (membre ou visiteur d'un Circle public) ne reçoit pas
  // l'email des autres membres. Cf. SEC-11 (jumeau de RT-01).
  return {
    ...page,
    members: visibleMembersFor(isActiveOrganizer(membership), page.members),
  };
}

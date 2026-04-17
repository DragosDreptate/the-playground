import type { CircleMembership } from "@/domain/models/circle";
import { isActiveOrganizer } from "@/domain/models/circle";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import {
  UnauthorizedCircleActionError,
  NotMemberOfCircleError,
  MembershipNotPendingError,
} from "@/domain/errors";

type ApproveCircleMembershipInput = {
  circleId: string;
  memberUserId: string;
  hostUserId: string;
};

type ApproveCircleMembershipDeps = {
  circleRepository: CircleRepository;
};

export async function approveCircleMembership(
  input: ApproveCircleMembershipInput,
  deps: ApproveCircleMembershipDeps
): Promise<CircleMembership> {
  const { circleRepository } = deps;

  // 1. Vérifier que l'appelant est Organisateur ACTIF du Circle (HOST ou CO_HOST)
  const callerMembership = await circleRepository.findMembership(
    input.circleId,
    input.hostUserId
  );
  if (!isActiveOrganizer(callerMembership)) {
    throw new UnauthorizedCircleActionError(input.hostUserId, input.circleId);
  }

  // 2. Charger la membership du membre
  const membership = await circleRepository.findMembership(
    input.circleId,
    input.memberUserId
  );
  if (!membership) {
    throw new NotMemberOfCircleError(input.circleId);
  }

  // 3. Vérifier que le statut est PENDING
  if (membership.status !== "PENDING") {
    throw new MembershipNotPendingError(input.circleId, input.memberUserId);
  }

  // 4. Approuver
  return circleRepository.updateMembershipStatus(
    input.circleId,
    input.memberUserId,
    "ACTIVE"
  );
}

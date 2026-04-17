import { isActiveOrganizer } from "@/domain/models/circle";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import {
  UnauthorizedCircleActionError,
  NotMemberOfCircleError,
  MembershipNotPendingError,
} from "@/domain/errors";

type RejectCircleMembershipInput = {
  circleId: string;
  memberUserId: string;
  hostUserId: string;
};

type RejectCircleMembershipDeps = {
  circleRepository: CircleRepository;
};

export async function rejectCircleMembership(
  input: RejectCircleMembershipInput,
  deps: RejectCircleMembershipDeps
): Promise<void> {
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

  // 4. Supprimer la membership (D9 — permet une re-tentative)
  await circleRepository.removeMembership(input.circleId, input.memberUserId);
}

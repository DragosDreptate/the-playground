import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import {
  UnauthorizedCircleActionError,
  CannotRemoveSelfError,
  NotMemberOfCircleError,
  CannotRemoveHostError,
} from "@/domain/errors";

type RemoveCircleMemberInput = {
  circleId: string;
  hostUserId: string;
  targetUserId: string;
};

type RemoveCircleMemberDeps = {
  circleRepository: CircleRepository;
  registrationRepository: RegistrationRepository;
};

type RemoveCircleMemberResult = {
  cancelledRegistrations: number;
  promotedRegistrations: number;
};

export async function removeCircleMember(
  input: RemoveCircleMemberInput,
  deps: RemoveCircleMemberDeps
): Promise<RemoveCircleMemberResult> {
  const { circleRepository, registrationRepository } = deps;

  // 1. Vérifie que l'appelant est HOST
  const callerMembership = await circleRepository.findMembership(
    input.circleId,
    input.hostUserId
  );
  if (!callerMembership || callerMembership.role !== "HOST") {
    throw new UnauthorizedCircleActionError(input.hostUserId, input.circleId);
  }

  // 2. L'Organisateur ne peut pas se retirer lui-même
  if (input.hostUserId === input.targetUserId) {
    throw new CannotRemoveSelfError();
  }

  // 3. Vérifie que la cible est bien membre
  const targetMembership = await circleRepository.findMembership(
    input.circleId,
    input.targetUserId
  );
  if (!targetMembership) {
    throw new NotMemberOfCircleError(input.circleId);
  }

  // 4. On ne peut pas retirer un HOST via cette action
  if (targetMembership.role === "HOST") {
    throw new CannotRemoveHostError();
  }

  // 5. Annule les inscriptions actives à venir (REGISTERED + WAITLIST)
  const futureRegs = await registrationRepository.findFutureActiveByUserAndCircle(
    input.targetUserId,
    input.circleId
  );

  let cancelledRegistrations = 0;
  let promotedRegistrations = 0;

  for (const reg of futureRegs) {
    const wasRegistered = reg.status === "REGISTERED";

    await registrationRepository.update(reg.id, {
      status: "CANCELLED",
      cancelledAt: new Date(),
    });
    cancelledRegistrations++;

    // Promotion liste d'attente si la place se libère
    if (wasRegistered) {
      const firstWaitlisted = await registrationRepository.findFirstWaitlisted(
        reg.momentId
      );
      if (firstWaitlisted) {
        await registrationRepository.update(firstWaitlisted.id, {
          status: "REGISTERED",
        });
        promotedRegistrations++;
      }
    }
  }

  // 6. Supprime la membership
  await circleRepository.removeMembership(input.circleId, input.targetUserId);

  // 7. Supprime le follow s'il existe (silencieux — pas d'erreur si absent)
  try {
    await circleRepository.unfollowCircle(input.targetUserId, input.circleId);
  } catch {
    // L'utilisateur ne suivait pas la Communauté — pas d'erreur
  }

  return { cancelledRegistrations, promotedRegistrations };
}

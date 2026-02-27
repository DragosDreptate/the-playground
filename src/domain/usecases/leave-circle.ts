import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import {
  CannotLeaveAsHostError,
  NotMemberOfCircleError,
} from "@/domain/errors";

type LeaveCircleInput = {
  circleId: string;
  userId: string;
};

type LeaveCircleDeps = {
  circleRepository: CircleRepository;
  registrationRepository: RegistrationRepository;
};

type LeaveCircleResult = {
  cancelledRegistrations: number;
  promotedRegistrations: number;
};

export async function leaveCircle(
  input: LeaveCircleInput,
  deps: LeaveCircleDeps
): Promise<LeaveCircleResult> {
  const { circleRepository, registrationRepository } = deps;

  // 1. Vérifie que l'utilisateur est bien membre
  const membership = await circleRepository.findMembership(
    input.circleId,
    input.userId
  );
  if (!membership) {
    throw new NotMemberOfCircleError(input.circleId);
  }

  // 2. Un HOST ne peut pas quitter sa Communauté
  if (membership.role === "HOST") {
    throw new CannotLeaveAsHostError();
  }

  // 3. Annule les inscriptions actives à venir (REGISTERED + WAITLIST)
  const futureRegs = await registrationRepository.findFutureActiveByUserAndCircle(
    input.userId,
    input.circleId
  );

  let cancelledRegistrations = 0;
  let promotedRegistrations = 0;

  for (const reg of futureRegs) {
    const wasRegistered = reg.status === "REGISTERED";
    // reg.status === "WAITLISTED" → place non prise, pas de promotion nécessaire

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

  // 4. Supprime la membership
  await circleRepository.removeMembership(input.circleId, input.userId);

  // 5. Supprime le follow s'il existe (silencieux — pas d'erreur si absent)
  try {
    await circleRepository.unfollowCircle(input.userId, input.circleId);
  } catch {
    // L'utilisateur ne suivait pas la Communauté — pas d'erreur
  }

  return { cancelledRegistrations, promotedRegistrations };
}

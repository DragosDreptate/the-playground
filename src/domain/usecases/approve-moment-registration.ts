import type { Registration } from "@/domain/models/registration";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import {
  RegistrationNotFoundError,
  RegistrationNotPendingApprovalError,
  UnauthorizedCircleActionError,
} from "@/domain/errors";

type ApproveMomentRegistrationInput = {
  registrationId: string;
  hostUserId: string;
};

type ApproveMomentRegistrationDeps = {
  registrationRepository: RegistrationRepository;
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
};

type ApproveMomentRegistrationResult = {
  registration: Registration;
  circleAutoJoined: boolean;
  circleJoinPending: boolean;
};

export async function approveMomentRegistration(
  input: ApproveMomentRegistrationInput,
  deps: ApproveMomentRegistrationDeps
): Promise<ApproveMomentRegistrationResult> {
  const { registrationRepository, momentRepository, circleRepository } = deps;

  // 1. Charger la Registration
  const registration = await registrationRepository.findById(input.registrationId);
  if (!registration) {
    throw new RegistrationNotFoundError(input.registrationId);
  }

  // 2. Vérifier que le statut est PENDING_APPROVAL
  if (registration.status !== "PENDING_APPROVAL") {
    throw new RegistrationNotPendingApprovalError(input.registrationId);
  }

  // 3. Charger le Moment et vérifier que l'appelant est HOST
  const moment = await momentRepository.findById(registration.momentId);
  if (!moment) {
    throw new RegistrationNotFoundError(input.registrationId);
  }

  const hostMembership = await circleRepository.findMembership(
    moment.circleId,
    input.hostUserId
  );
  if (!hostMembership || hostMembership.role !== "HOST" || hostMembership.status !== "ACTIVE") {
    throw new UnauthorizedCircleActionError(input.hostUserId, moment.circleId);
  }

  // 4. Déterminer le statut : REGISTERED ou WAITLISTED selon la capacité
  let newStatus: "REGISTERED" | "WAITLISTED" = "REGISTERED";
  if (moment.capacity) {
    const registeredCount = await registrationRepository.countByMomentIdAndStatus(
      moment.id,
      "REGISTERED"
    );
    if (registeredCount >= moment.capacity) {
      newStatus = "WAITLISTED";
    }
  }

  // 5. Mettre à jour la Registration
  const updatedRegistration = await registrationRepository.update(
    input.registrationId,
    { status: newStatus }
  );

  // 6. Auto-join Circle si pas encore membre
  let circleAutoJoined = false;
  let circleJoinPending = false;

  const existingMembership = await circleRepository.findMembership(
    moment.circleId,
    registration.userId
  );

  if (!existingMembership) {
    const circle = await circleRepository.findById(moment.circleId);
    const membershipStatus = circle?.requiresApproval ? "PENDING" : "ACTIVE";
    await circleRepository.addMembership(
      moment.circleId,
      registration.userId,
      "PLAYER",
      membershipStatus
    );
    circleAutoJoined = membershipStatus === "ACTIVE";
    circleJoinPending = membershipStatus === "PENDING";
  }

  return {
    registration: updatedRegistration,
    circleAutoJoined,
    circleJoinPending,
  };
}

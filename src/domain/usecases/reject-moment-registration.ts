import type { Registration } from "@/domain/models/registration";
import { isActiveOrganizer } from "@/domain/models/circle";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import {
  RegistrationNotFoundError,
  RegistrationNotPendingApprovalError,
  UnauthorizedCircleActionError,
} from "@/domain/errors";

type RejectMomentRegistrationInput = {
  registrationId: string;
  hostUserId: string;
};

type RejectMomentRegistrationDeps = {
  registrationRepository: RegistrationRepository;
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
};

export async function rejectMomentRegistration(
  input: RejectMomentRegistrationInput,
  deps: RejectMomentRegistrationDeps
): Promise<Registration> {
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

  const callerMembership = await circleRepository.findMembership(
    moment.circleId,
    input.hostUserId
  );
  if (!isActiveOrganizer(callerMembership)) {
    throw new UnauthorizedCircleActionError(input.hostUserId, moment.circleId);
  }

  // 4. Rejeter
  return registrationRepository.update(input.registrationId, {
    status: "REJECTED",
  });
}

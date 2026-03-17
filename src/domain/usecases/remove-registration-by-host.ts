import type { Registration } from "@/domain/models/registration";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import {
  RegistrationNotFoundError,
  UnauthorizedCircleActionError,
  CannotRemoveHostRegistrationError,
} from "@/domain/errors";

type RemoveRegistrationByHostInput = {
  registrationId: string;
  hostUserId: string;
};

type RemoveRegistrationByHostDeps = {
  registrationRepository: RegistrationRepository;
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
};

type RemoveRegistrationByHostResult = {
  cancelledRegistration: Registration;
  promotedRegistration: Registration | null;
};

export async function removeRegistrationByHost(
  input: RemoveRegistrationByHostInput,
  deps: RemoveRegistrationByHostDeps
): Promise<RemoveRegistrationByHostResult> {
  const { registrationRepository, momentRepository, circleRepository } = deps;

  // 1. Charge la registration (erreur si inexistante ou déjà annulée)
  const registration = await registrationRepository.findById(input.registrationId);
  if (!registration || registration.status === "CANCELLED") {
    throw new RegistrationNotFoundError(input.registrationId);
  }

  // 2. Charge le Moment pour récupérer le circleId
  const moment = await momentRepository.findById(registration.momentId);
  if (!moment) {
    throw new RegistrationNotFoundError(input.registrationId);
  }

  // 3. Charge les memberships en parallèle — indépendantes l'une de l'autre
  const [callerMembership, targetMembership] = await Promise.all([
    circleRepository.findMembership(moment.circleId, input.hostUserId),
    circleRepository.findMembership(moment.circleId, registration.userId),
  ]);

  // 3a. Vérifie que l'appelant est HOST du Circle
  if (!callerMembership || callerMembership.role !== "HOST") {
    throw new UnauthorizedCircleActionError(input.hostUserId, moment.circleId);
  }

  // 3b. Empêche de retirer l'inscription d'un autre HOST
  if (targetMembership?.role === "HOST") {
    throw new CannotRemoveHostRegistrationError();
  }

  const wasRegistered = registration.status === "REGISTERED";

  // 5. Annule la registration
  const cancelledRegistration = await registrationRepository.update(
    input.registrationId,
    { status: "CANCELLED", cancelledAt: new Date() }
  );

  // 6. Promeut le premier WAITLISTED si une place se libère
  let promotedRegistration: Registration | null = null;
  if (wasRegistered) {
    const firstWaitlisted = await registrationRepository.findFirstWaitlisted(
      registration.momentId
    );
    if (firstWaitlisted) {
      promotedRegistration = await registrationRepository.update(
        firstWaitlisted.id,
        { status: "REGISTERED" }
      );
    }
  }

  return { cancelledRegistration, promotedRegistration };
}

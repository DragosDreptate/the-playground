import type { Registration } from "@/domain/models/registration";
import { isActiveOrganizer, isOrganizerRole } from "@/domain/models/circle";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { PaymentService } from "@/domain/ports/services/payment-service";
import { refundRegistration } from "./refund-registration";
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
  paymentService?: PaymentService;
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

  // 3a. Vérifie que l'appelant est Organisateur ACTIF (HOST ou CO_HOST)
  if (!isActiveOrganizer(callerMembership)) {
    throw new UnauthorizedCircleActionError(input.hostUserId, moment.circleId);
  }

  // 3b. Empêche un CO_HOST de retirer l'inscription d'un autre Organisateur (D11)
  // Un HOST peut retirer un CO_HOST. La contrainte DB empêche de toute façon deux HOSTs.
  if (targetMembership && isOrganizerRole(targetMembership.role)) {
    if (callerMembership!.role !== "HOST") {
      throw new CannotRemoveHostRegistrationError();
    }
  }

  const wasRegistered = registration.status === "REGISTERED";

  // 4. Refund if paid (Host removing = force refund, like event cancellation)
  // Refund failure must not block the removal
  if (deps.paymentService && registration.paymentStatus === "PAID") {
    try {
      await refundRegistration(
        { registration, moment, force: true },
        { registrationRepository, paymentService: deps.paymentService }
      );
    } catch {
      // Refund failure must not block removal — error is captured by the caller
    }
  }

  // 5. Annule la registration
  const cancelledRegistration = await registrationRepository.update(
    input.registrationId,
    { status: "CANCELLED", cancelledAt: new Date() }
  );

  // 6. Promeut le premier WAITLISTED si une place se libère (free events only)
  let promotedRegistration: Registration | null = null;
  if (wasRegistered && moment.price === 0) {
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

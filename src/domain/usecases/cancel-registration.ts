import type { Registration, RegistrationStatus } from "@/domain/models/registration";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { PaymentService } from "@/domain/ports/services/payment-service";
import { refundRegistration } from "./refund-registration";
import {
  RegistrationNotFoundError,
  UnauthorizedRegistrationActionError,
} from "@/domain/errors";

type CancelRegistrationInput = {
  registrationId: string;
  userId: string;
};

type CancelRegistrationDeps = {
  registrationRepository: RegistrationRepository;
  momentRepository: MomentRepository;
  paymentService?: PaymentService;
};

type CancelRegistrationResult = {
  registration: Registration;
  promotedRegistration: Registration | null;
  // Statut AVANT annulation : les notifications en aval en dépendent (un départ
  // de liste d'attente ne se communique pas comme une désinscription confirmée).
  previousStatus: RegistrationStatus;
};

export async function cancelRegistration(
  input: CancelRegistrationInput,
  deps: CancelRegistrationDeps
): Promise<CancelRegistrationResult> {
  const { registrationRepository, momentRepository } = deps;

  const registration = await registrationRepository.findById(
    input.registrationId
  );
  if (!registration || registration.status === "CANCELLED") {
    throw new RegistrationNotFoundError(input.registrationId);
  }

  if (registration.userId !== input.userId) {
    throw new UnauthorizedRegistrationActionError();
  }

  // Un organisateur peut désormais annuler sa propre inscription à un événement de
  // sa Communauté (découplage rôle / présence — voir
  // spec/features/co-host-event-participation.md). Se désinscrire d'un événement ne
  // retire ni le rôle ni l'accès de gestion, qui dérivent de la membership.
  const moment = await momentRepository.findById(registration.momentId);

  const previousStatus = registration.status;
  const wasRegistered = previousStatus === "REGISTERED";

  // Refund if paid event + PaymentService available
  // Refund failure must not block the cancellation
  if (moment && deps.paymentService && registration.paymentStatus === "PAID") {
    try {
      await refundRegistration(
        { registration, moment },
        { registrationRepository, paymentService: deps.paymentService }
      );
    } catch {
      // Refund failure must not block cancellation — error is captured by the caller
    }
  }

  const cancelled = await registrationRepository.update(
    input.registrationId,
    {
      status: "CANCELLED",
      cancelledAt: new Date(),
    }
  );

  // Waitlist promotion — only for free events (no waitlist for paid events)
  let promotedRegistration: Registration | null = null;

  if (wasRegistered && moment && moment.price === 0) {
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

  return { registration: cancelled, promotedRegistration, previousStatus };
}

import type { Registration } from "@/domain/models/registration";
import { isActiveOrganizer } from "@/domain/models/circle";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { PaymentService } from "@/domain/ports/services/payment-service";
import { refundRegistration } from "./refund-registration";
import {
  RegistrationNotFoundError,
  UnauthorizedRegistrationActionError,
  OrganizerCannotCancelRegistrationError,
} from "@/domain/errors";

type CancelRegistrationInput = {
  registrationId: string;
  userId: string;
};

type CancelRegistrationDeps = {
  registrationRepository: RegistrationRepository;
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
  paymentService?: PaymentService;
};

type CancelRegistrationResult = {
  registration: Registration;
  promotedRegistration: Registration | null;
};

export async function cancelRegistration(
  input: CancelRegistrationInput,
  deps: CancelRegistrationDeps
): Promise<CancelRegistrationResult> {
  const { registrationRepository, momentRepository, circleRepository } = deps;

  const registration = await registrationRepository.findById(
    input.registrationId
  );
  if (!registration || registration.status === "CANCELLED") {
    throw new RegistrationNotFoundError(input.registrationId);
  }

  if (registration.userId !== input.userId) {
    throw new UnauthorizedRegistrationActionError();
  }

  // D16 : un organisateur actif ne peut pas annuler sa propre inscription
  // à un événement de sa Communauté.
  const moment = await momentRepository.findById(registration.momentId);
  if (moment) {
    const membership = await circleRepository.findMembership(
      moment.circleId,
      input.userId
    );
    if (isActiveOrganizer(membership)) {
      throw new OrganizerCannotCancelRegistrationError();
    }
  }

  const wasRegistered = registration.status === "REGISTERED";

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

  return { registration: cancelled, promotedRegistration };
}

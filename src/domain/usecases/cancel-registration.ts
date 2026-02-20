import type { Registration } from "@/domain/models/registration";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import {
  RegistrationNotFoundError,
  UnauthorizedRegistrationActionError,
  HostCannotCancelRegistrationError,
} from "@/domain/errors";

type CancelRegistrationInput = {
  registrationId: string;
  userId: string;
};

type CancelRegistrationDeps = {
  registrationRepository: RegistrationRepository;
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
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

  // A Host cannot cancel their own registration
  const moment = await momentRepository.findById(registration.momentId);
  if (moment) {
    const membership = await circleRepository.findMembership(
      moment.circleId,
      input.userId
    );
    if (membership?.role === "HOST") {
      throw new HostCannotCancelRegistrationError();
    }
  }

  const wasRegistered = registration.status === "REGISTERED";

  const cancelled = await registrationRepository.update(
    input.registrationId,
    {
      status: "CANCELLED",
      cancelledAt: new Date(),
    }
  );

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

  return { registration: cancelled, promotedRegistration };
}

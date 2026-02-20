import type { Registration } from "@/domain/models/registration";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
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
};

type CancelRegistrationResult = {
  registration: Registration;
  promotedRegistration: Registration | null;
};

export async function cancelRegistration(
  input: CancelRegistrationInput,
  deps: CancelRegistrationDeps
): Promise<CancelRegistrationResult> {
  const { registrationRepository } = deps;

  const registration = await registrationRepository.findById(
    input.registrationId
  );
  if (!registration || registration.status === "CANCELLED") {
    throw new RegistrationNotFoundError(input.registrationId);
  }

  if (registration.userId !== input.userId) {
    throw new UnauthorizedRegistrationActionError();
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

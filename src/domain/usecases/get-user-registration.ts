import type { Registration } from "@/domain/models/registration";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";

type GetUserRegistrationInput = {
  momentId: string;
  userId: string;
};

type GetUserRegistrationDeps = {
  registrationRepository: RegistrationRepository;
};

export async function getUserRegistration(
  input: GetUserRegistrationInput,
  deps: GetUserRegistrationDeps
): Promise<Registration | null> {
  const { registrationRepository } = deps;

  const registration = await registrationRepository.findByMomentAndUser(
    input.momentId,
    input.userId
  );

  if (!registration || registration.status === "CANCELLED") {
    return null;
  }

  return registration;
}

import type { RegistrationWithMoment } from "@/domain/models/registration";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";

type GetUserPastMomentsDeps = {
  registrationRepository: RegistrationRepository;
};

export async function getUserPastMoments(
  userId: string,
  deps: GetUserPastMomentsDeps
): Promise<RegistrationWithMoment[]> {
  return deps.registrationRepository.findPastByUserId(userId);
}

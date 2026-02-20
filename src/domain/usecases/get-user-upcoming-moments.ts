import type { RegistrationWithMoment } from "@/domain/models/registration";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";

type GetUserUpcomingMomentsDeps = {
  registrationRepository: RegistrationRepository;
};

export async function getUserUpcomingMoments(
  userId: string,
  deps: GetUserUpcomingMomentsDeps
): Promise<RegistrationWithMoment[]> {
  return deps.registrationRepository.findUpcomingByUserId(userId);
}

import type { RegistrationWithUser } from "@/domain/models/registration";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import {
  MomentNotFoundError,
  UnauthorizedMomentActionError,
} from "@/domain/errors";

type GetMomentRegistrationsInput = {
  momentId: string;
  userId: string;
};

type GetMomentRegistrationsDeps = {
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
  registrationRepository: RegistrationRepository;
};

type GetMomentRegistrationsResult = {
  registrations: RegistrationWithUser[];
  registeredCount: number;
  waitlistedCount: number;
};

export async function getMomentRegistrations(
  input: GetMomentRegistrationsInput,
  deps: GetMomentRegistrationsDeps
): Promise<GetMomentRegistrationsResult> {
  const { momentRepository, circleRepository, registrationRepository } = deps;

  const moment = await momentRepository.findById(input.momentId);
  if (!moment) {
    throw new MomentNotFoundError(input.momentId);
  }

  const membership = await circleRepository.findMembership(
    moment.circleId,
    input.userId
  );
  if (!membership || membership.role !== "HOST") {
    throw new UnauthorizedMomentActionError();
  }

  const registrations =
    await registrationRepository.findActiveWithUserByMomentId(input.momentId);

  const registeredCount = registrations.filter(
    (r) => r.status === "REGISTERED"
  ).length;
  const waitlistedCount = registrations.filter(
    (r) => r.status === "WAITLISTED"
  ).length;

  return { registrations, registeredCount, waitlistedCount };
}

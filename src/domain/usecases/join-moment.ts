import type { Registration } from "@/domain/models/registration";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import {
  MomentNotFoundError,
  MomentNotOpenForRegistrationError,
  MomentAlreadyStartedError,
  PaidMomentNotSupportedError,
  AlreadyRegisteredError,
} from "@/domain/errors";

type JoinMomentInput = {
  momentId: string;
  userId: string;
};

type JoinMomentDeps = {
  momentRepository: MomentRepository;
  registrationRepository: RegistrationRepository;
  circleRepository: CircleRepository;
};

type JoinMomentResult = {
  registration: Registration;
};

export async function joinMoment(
  input: JoinMomentInput,
  deps: JoinMomentDeps
): Promise<JoinMomentResult> {
  const { momentRepository, registrationRepository, circleRepository } = deps;

  const moment = await momentRepository.findById(input.momentId);
  if (!moment) {
    throw new MomentNotFoundError(input.momentId);
  }

  if (moment.status !== "PUBLISHED") {
    throw new MomentNotOpenForRegistrationError(input.momentId);
  }

  if (moment.startsAt <= new Date()) {
    throw new MomentAlreadyStartedError(input.momentId);
  }

  if (moment.price > 0) {
    throw new PaidMomentNotSupportedError(input.momentId);
  }

  const existing = await registrationRepository.findByMomentAndUser(
    input.momentId,
    input.userId
  );
  if (existing && existing.status !== "CANCELLED") {
    throw new AlreadyRegisteredError(input.momentId, input.userId);
  }

  const registeredCount = await registrationRepository.countByMomentIdAndStatus(
    input.momentId,
    "REGISTERED"
  );

  const status =
    moment.capacity !== null && registeredCount >= moment.capacity
      ? "WAITLISTED"
      : "REGISTERED";

  // Re-activate cancelled registration or create a new one
  const registration = existing?.status === "CANCELLED"
    ? await registrationRepository.update(existing.id, {
        status,
        cancelledAt: null,
      })
    : await registrationRepository.create({
        momentId: input.momentId,
        userId: input.userId,
        status,
      });

  // Auto-join Circle as PLAYER (idempotent)
  const membership = await circleRepository.findMembership(
    moment.circleId,
    input.userId
  );
  if (!membership) {
    await circleRepository.addMembership(
      moment.circleId,
      input.userId,
      "PLAYER"
    );
  }

  return { registration };
}

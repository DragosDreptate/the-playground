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
  pendingApproval: boolean;
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

  // Check existing registration
  const existing = await registrationRepository.findByMomentAndUser(
    input.momentId,
    input.userId
  );

  if (existing) {
    // Already active → error
    if (existing.status === "REGISTERED" || existing.status === "WAITLISTED" || existing.status === "CHECKED_IN") {
      throw new AlreadyRegisteredError(input.momentId, input.userId);
    }
    // Already pending → idempotent return
    if (existing.status === "PENDING_APPROVAL") {
      return { registration: existing, pendingApproval: true };
    }
    // CANCELLED or REJECTED → re-activate below
  }

  // Determine registration status
  if (moment.requiresApproval) {
    // Requires approval → PENDING_APPROVAL, no auto-join Circle
    const registration = existing && (existing.status === "CANCELLED" || existing.status === "REJECTED")
      ? await registrationRepository.update(existing.id, {
          status: "PENDING_APPROVAL",
          cancelledAt: null,
        })
      : await registrationRepository.create({
          momentId: input.momentId,
          userId: input.userId,
          status: "PENDING_APPROVAL",
        });

    return { registration, pendingApproval: true };
  }

  // No approval required → normal flow
  const registeredCount = await registrationRepository.countByMomentIdAndStatus(
    input.momentId,
    "REGISTERED"
  );

  const status =
    moment.capacity !== null && registeredCount >= moment.capacity
      ? "WAITLISTED"
      : "REGISTERED";

  // Re-activate cancelled/rejected registration or create a new one
  const registration = existing && (existing.status === "CANCELLED" || existing.status === "REJECTED")
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
    // D2 Option A: if Circle requires approval → PENDING, else ACTIVE
    const circle = await circleRepository.findById(moment.circleId);
    const membershipStatus = circle?.requiresApproval ? "PENDING" : "ACTIVE";
    await circleRepository.addMembership(
      moment.circleId,
      input.userId,
      "PLAYER",
      membershipStatus
    );
  }

  return { registration, pendingApproval: false };
}

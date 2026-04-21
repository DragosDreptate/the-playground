import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { RegistrationWithUser } from "@/domain/models/registration";
import {
  MomentNotFoundError,
  CircleNotFoundError,
  UnauthorizedMomentActionError,
} from "@/domain/errors";

export type GetMomentParticipantsPageDeps = {
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
  registrationRepository: RegistrationRepository;
};

export type GetMomentParticipantsPageInput = {
  momentId: string;
  offset: number;
  limit: number;
  callerUserId: string | null;
};

export type GetMomentParticipantsPageResult = {
  participants: RegistrationWithUser[];
  total: number;
  hasMore: boolean;
};

/**
 * Liste paginée des participants REGISTERED d'un Moment.
 * Règle d'accès : utilisateur authentifié ET (Circle PUBLIC OU membre ACTIF du Circle).
 */
export async function getMomentParticipantsPage(
  input: GetMomentParticipantsPageInput,
  deps: GetMomentParticipantsPageDeps,
): Promise<GetMomentParticipantsPageResult> {
  const { momentId, offset, limit, callerUserId } = input;

  if (!callerUserId) {
    throw new UnauthorizedMomentActionError();
  }

  const moment = await deps.momentRepository.findById(momentId);
  if (!moment) throw new MomentNotFoundError(momentId);

  const circle = await deps.circleRepository.findById(moment.circleId);
  if (!circle) throw new CircleNotFoundError(moment.circleId);

  if (circle.visibility !== "PUBLIC") {
    const membership = await deps.circleRepository.findMembership(circle.id, callerUserId);
    if (membership?.status !== "ACTIVE") {
      throw new UnauthorizedMomentActionError();
    }
  }

  return deps.registrationRepository.findParticipantsPaginated(momentId, {
    offset,
    limit,
  });
}

import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { RegistrationWithUser } from "@/domain/models/registration";
import { redactRegistrationForNonHost } from "@/domain/models/registration";
import { isActiveOrganizer } from "@/domain/models/circle";
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

  // Le rôle est désormais toujours chargé : il conditionne l'accès (Circle privé)
  // ET la redaction PII (seul l'Organisateur reçoit email + Stripe des inscrits).
  const membership = await deps.circleRepository.findMembership(circle.id, callerUserId);

  if (circle.visibility !== "PUBLIC" && membership?.status !== "ACTIVE") {
    throw new UnauthorizedMomentActionError();
  }

  const page = await deps.registrationRepository.findParticipantsPaginated(momentId, {
    offset,
    limit,
    priorityUserId: callerUserId,
  });

  // Un non-Organisateur (membre ou simple visiteur d'un Circle public) ne reçoit
  // qu'un participant réduit : ni email ni identifiants Stripe. Cf. red team #1.
  if (isActiveOrganizer(membership)) return page;

  return { ...page, participants: page.participants.map(redactRegistrationForNonHost) };
}

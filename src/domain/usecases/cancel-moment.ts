import type { Moment } from "@/domain/models/moment";
import { isActiveOrganizer } from "@/domain/models/circle";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import {
  MomentNotFoundError,
  UnauthorizedMomentActionError,
  MomentCannotBeCancelledError,
} from "@/domain/errors";

type CancelMomentInput = {
  momentId: string;
  userId: string;
};

type CancelMomentDeps = {
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
  registrationRepository: RegistrationRepository;
};

type CancelMomentResult = {
  moment: Moment;
};

export async function cancelMoment(
  input: CancelMomentInput,
  deps: CancelMomentDeps
): Promise<CancelMomentResult> {
  const { momentRepository, circleRepository, registrationRepository } = deps;

  const existing = await momentRepository.findById(input.momentId);
  if (!existing) {
    throw new MomentNotFoundError(input.momentId);
  }

  const membership = await circleRepository.findMembership(
    existing.circleId,
    input.userId
  );
  if (!isActiveOrganizer(membership)) {
    throw new UnauthorizedMomentActionError();
  }

  // On n'annule qu'un événement publié.
  // DRAFT → on supprime ; PAST → archive ; CANCELLED → déjà annulé.
  if (existing.status !== "PUBLISHED") {
    throw new MomentCannotBeCancelledError(input.momentId, existing.status);
  }

  // Le usecase ne fait que les mutations DB fiables et idempotentes : bascule du
  // statut + rejet des demandes en attente. Les effets externes faillibles
  // (remboursements Stripe, email d'annulation) sont orchestrés en best-effort par
  // l'action appelante, APRÈS cette transition et HORS de la garde de statut. Ainsi
  // un échec Stripe ne bloque ni l'annulation déjà persistée, ni un éventuel retry
  // (que la garde `status !== PUBLISHED` empêcherait sinon), et ne prive pas les
  // demandes en attente de leur rejet.
  const moment = await momentRepository.update(input.momentId, {
    status: "CANCELLED",
  });

  await registrationRepository.rejectAllPendingApprovals(input.momentId);

  return { moment };
}

import type { Moment } from "@/domain/models/moment";
import { isActiveOrganizer } from "@/domain/models/circle";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { PaymentService } from "@/domain/ports/services/payment-service";
import { refundAllPaidRegistrations } from "./refund-all-paid-registrations";
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
  paymentService: PaymentService;
};

type CancelMomentResult = {
  moment: Moment;
};

export async function cancelMoment(
  input: CancelMomentInput,
  deps: CancelMomentDeps
): Promise<CancelMomentResult> {
  const { momentRepository, circleRepository, registrationRepository, paymentService } =
    deps;

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

  // L'annulation est la source de vérité : on bascule le statut EN PREMIER (mutation
  // fiable), puis on déclenche les effets (remboursements, rejet des demandes en
  // attente). Si un effet échoue ensuite, l'événement reste correctement annulé et
  // les remboursements (idempotents) restent retentables — préférable à l'inverse
  // (remboursé mais toujours PUBLISHED).
  const moment = await momentRepository.update(input.momentId, {
    status: "CANCELLED",
  });

  await refundAllPaidRegistrations(existing, { registrationRepository, paymentService });
  await registrationRepository.rejectAllPendingApprovals(input.momentId);

  return { moment };
}

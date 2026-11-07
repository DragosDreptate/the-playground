import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import { isActiveOrganizer } from "@/domain/models/circle";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { PaymentService } from "@/domain/ports/services/payment-service";
import { refundAllPaidRegistrations } from "./refund-all-paid-registrations";
import {
  MomentNotFoundError,
  UnauthorizedMomentActionError,
  MomentRefundsFailedError,
} from "@/domain/errors";

type DeleteMomentInput = {
  momentId: string;
  userId: string;
};

type DeleteMomentDeps = {
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
  registrationRepository: RegistrationRepository;
  paymentService: PaymentService;
};

export async function deleteMoment(
  input: DeleteMomentInput,
  deps: DeleteMomentDeps
): Promise<void> {
  const { momentRepository, circleRepository } = deps;

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

  // La garde « pas de suppression d'un événement passé » dépend du rôle (un admin
  // qui modère doit pouvoir tout supprimer) : elle vit dans deleteMomentAction,
  // pas ici, car le usecase pur n'a pas la notion de session/admin.

  // Remboursement des inscrits payants avant la suppression (cascade DB).
  const { failures } = await refundAllPaidRegistrations(existing, {
    registrationRepository: deps.registrationRepository,
    paymentService: deps.paymentService,
  });
  // Une inscription supprimée ne se rembourse plus : on garde l'événement.
  if (failures.length > 0) {
    throw new MomentRefundsFailedError(
      input.momentId,
      failures.map(({ registration }) => registration.userId)
    );
  }

  await momentRepository.delete(input.momentId);
}

import type { Moment } from "@/domain/models/moment";
import { isActiveOrganizer } from "@/domain/models/circle";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { PaymentService } from "@/domain/ports/services/payment-service";
import { refundRegistration } from "./refund-registration";
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

  // Rembourse les inscrits payants (annulation Organisateur = force).
  if (existing.price > 0) {
    const registrations = await registrationRepository.findActiveByMomentId(
      input.momentId
    );
    const paidRegistrations = registrations.filter(
      (r) => r.paymentStatus === "PAID" && r.stripePaymentIntentId
    );
    await Promise.all(
      paidRegistrations.map((r) =>
        refundRegistration(
          { registration: r, moment: existing, force: true },
          { registrationRepository, paymentService }
        )
      )
    );
  }

  // Rejette les inscriptions en attente d'approbation (déplacé depuis updateMoment).
  await registrationRepository.rejectAllPendingApprovals(input.momentId);

  const moment = await momentRepository.update(input.momentId, {
    status: "CANCELLED",
  });

  return { moment };
}

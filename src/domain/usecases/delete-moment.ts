import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import { isActiveOrganizer } from "@/domain/models/circle";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { PaymentService } from "@/domain/ports/services/payment-service";
import { refundRegistration } from "./refund-registration";
import {
  MomentNotFoundError,
  UnauthorizedMomentActionError,
} from "@/domain/errors";

type DeleteMomentInput = {
  momentId: string;
  userId: string;
};

type DeleteMomentDeps = {
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
  registrationRepository?: RegistrationRepository;
  paymentService?: PaymentService;
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

  // Refund all PAID registrations before deletion (Organisateur cancellation = force)
  if (existing.price > 0 && deps.registrationRepository && deps.paymentService) {
    const registrations = await deps.registrationRepository.findActiveByMomentId(
      input.momentId
    );
    const paidRegistrations = registrations.filter(
      (r) => r.paymentStatus === "PAID" && r.stripePaymentIntentId
    );
    await Promise.all(
      paidRegistrations.map((r) =>
        refundRegistration(
          { registration: r, moment: existing, force: true },
          {
            registrationRepository: deps.registrationRepository!,
            paymentService: deps.paymentService!,
          }
        )
      )
    );
  }

  await momentRepository.delete(input.momentId);
}

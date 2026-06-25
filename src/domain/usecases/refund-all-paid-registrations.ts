import type { Moment } from "@/domain/models/moment";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { PaymentService } from "@/domain/ports/services/payment-service";
import { refundRegistration } from "./refund-registration";

type Deps = {
  registrationRepository: RegistrationRepository;
  paymentService: PaymentService;
};

/**
 * Rembourse toutes les inscriptions PAID d'un événement (annulation Organisateur
 * = `force`, bypass du flag `refundable`). No-op pour un événement gratuit.
 * Partagé entre l'annulation et la suppression d'un événement.
 */
export async function refundAllPaidRegistrations(
  moment: Moment,
  deps: Deps
): Promise<void> {
  if (moment.price <= 0) return;

  const registrations = await deps.registrationRepository.findActiveByMomentId(
    moment.id
  );
  const paidRegistrations = registrations.filter(
    (r) => r.paymentStatus === "PAID" && r.stripePaymentIntentId
  );

  await Promise.all(
    paidRegistrations.map((r) =>
      refundRegistration({ registration: r, moment, force: true }, deps)
    )
  );
}

import type { Moment } from "@/domain/models/moment";
import type { Registration } from "@/domain/models/registration";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { PaymentService } from "@/domain/ports/services/payment-service";
import { refundRegistration } from "./refund-registration";

type Deps = {
  registrationRepository: RegistrationRepository;
  paymentService: PaymentService;
};

export type RefundFailure = { registration: Registration; error: unknown };

/**
 * Rembourse toutes les inscriptions PAID d'un événement (annulation Organisateur
 * = `force`, bypass du flag `refundable`). No-op pour un événement gratuit.
 * Partagé entre l'annulation, la suppression et le passage payant → gratuit.
 *
 * `activeRegistrations` permet de fournir les inscriptions actives déjà chargées
 * par l'appelant (évite un SELECT redondant) ; sinon elles sont relues ici.
 *
 * Un échec n'arrête pas les autres remboursements : les échecs sont retournés à
 * l'appelant, qui décide de bloquer ou de prévenir.
 */
export async function refundAllPaidRegistrations(
  moment: Moment,
  deps: Deps,
  activeRegistrations?: Registration[]
): Promise<{ failures: RefundFailure[] }> {
  if (moment.price <= 0) return { failures: [] };

  const registrations =
    activeRegistrations ??
    (await deps.registrationRepository.findActiveByMomentId(moment.id));
  const paidRegistrations = registrations.filter(
    (r) => r.paymentStatus === "PAID" && r.stripePaymentIntentId
  );

  const results = await Promise.allSettled(
    paidRegistrations.map((r) =>
      refundRegistration({ registration: r, moment, force: true }, deps)
    )
  );

  const failures: RefundFailure[] = [];
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      failures.push({ registration: paidRegistrations[index], error: result.reason });
    }
  });
  return { failures };
}

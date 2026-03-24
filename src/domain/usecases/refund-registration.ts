import type { Registration } from "@/domain/models/registration";
import type { Moment } from "@/domain/models/moment";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { PaymentService } from "@/domain/ports/services/payment-service";

type RefundRegistrationInput = {
  registration: Registration;
  moment: Moment;
  force?: boolean; // true = Organisateur annule l'événement (bypass refundable check)
};

type RefundRegistrationDeps = {
  registrationRepository: RegistrationRepository;
  paymentService: PaymentService;
};

type RefundRegistrationResult = {
  refunded: boolean;
};

export async function refundRegistration(
  input: RefundRegistrationInput,
  deps: RefundRegistrationDeps
): Promise<RefundRegistrationResult> {
  const { registration, moment, force = false } = input;
  const { registrationRepository, paymentService } = deps;

  // No payment to refund
  if (registration.paymentStatus !== "PAID" || !registration.stripePaymentIntentId) {
    return { refunded: false };
  }

  // Check refundable (unless forced by Organisateur cancellation)
  if (!force && !moment.refundable) {
    return { refunded: false };
  }

  // Call Stripe refund
  await paymentService.refund(registration.stripePaymentIntentId);

  // Update payment status
  await registrationRepository.update(registration.id, {
    paymentStatus: "REFUNDED",
  });

  return { refunded: true };
}

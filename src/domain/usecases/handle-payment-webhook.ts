import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { PaymentService } from "@/domain/ports/services/payment-service";
import { isConfirmedParticipation, type Registration } from "@/domain/models/registration";

type HandlePaymentWebhookInput = {
  payload: string;
  signature: string;
};

type HandlePaymentWebhookDeps = {
  paymentService: PaymentService;
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
  registrationRepository: RegistrationRepository;
};

/** Remboursement automatique refusé par Stripe : à signaler au propriétaire de la Communauté. */
export type WebhookRefundFailure = {
  momentId: string;
  userId: string;
};

type HandlePaymentWebhookResult =
  | { handled: true; registration: Registration }
  | { handled: false; reason: string; refundFailure?: WebhookRefundFailure };

export async function handlePaymentWebhook(
  input: HandlePaymentWebhookInput,
  deps: HandlePaymentWebhookDeps
): Promise<HandlePaymentWebhookResult> {
  const { paymentService, momentRepository, circleRepository, registrationRepository } = deps;

  // Parse and verify the webhook event
  const event = await paymentService.handleWebhookEvent(input.payload, input.signature);

  // Remboursement, y compris fait par l'Organisateur depuis Stripe. La participation
  // reste telle quelle : rembourser n'est pas désinscrire, l'Organisateur reste maître.
  if (event.type === "charge_refunded") {
    const refunded = await registrationRepository.findByStripePaymentIntentId(event.paymentIntentId);
    if (refunded?.paymentStatus !== "PAID") {
      return { handled: false, reason: "Refund already recorded or unknown payment" };
    }
    await registrationRepository.update(refunded.id, { paymentStatus: "REFUNDED" });
    return { handled: false, reason: "Refund recorded" };
  }

  if (event.type !== "checkout_completed") {
    return { handled: false, reason: `Ignored event type: ${event.type}` };
  }

  const { userId, momentId, circleId, paymentIntentId, receiptUrl, accountId } = event;

  // Validate metadata is present
  if (!userId || !momentId || !circleId) {
    return { handled: false, reason: "Missing metadata in checkout event" };
  }

  // Idempotence: check if registration already exists for this paymentIntentId
  if (paymentIntentId) {
    const existing = await registrationRepository.findByStripePaymentIntentId(paymentIntentId);
    if (existing) {
      return { handled: false, reason: `Registration already exists for paymentIntentId: ${paymentIntentId}` };
    }
  }

  // Paiement sans place à la clé : pas d'inscription, l'argent retourne au Participant.
  // Un refus définitif de Stripe n'est pas rejoué : il est remonté une seule fois.
  async function rejectPayment(reason: string): Promise<HandlePaymentWebhookResult> {
    if (!paymentIntentId) {
      return { handled: false, reason };
    }
    const { status } = await paymentService.refund({ paymentIntentId, accountId });
    if (status === "failed") {
      return {
        handled: false,
        reason: `${reason} — refund refused`,
        refundFailure: { momentId, userId },
      };
    }
    return { handled: false, reason: `${reason} — payment refunded` };
  }

  // La page de paiement reste ouverte 30 minutes : l'événement a pu changer entre-temps.
  const moment = await momentRepository.findById(momentId);
  if (!moment) {
    return rejectPayment(`Moment not found: ${momentId}`);
  }
  if (moment.status !== "PUBLISHED" || moment.price <= 0) {
    return rejectPayment("Event no longer open for payment");
  }

  const circle = await circleRepository.findById(moment.circleId);
  if (circle?.stripeConnectAccountId !== accountId) {
    return rejectPayment("Payment on another account");
  }

  // Race condition: check capacity
  if (moment.capacity !== null) {
    const activeCount = await registrationRepository.countActiveByMomentId(momentId);
    if (activeCount >= moment.capacity) {
      return rejectPayment("Event is full");
    }
  }

  const existingRegistration = await registrationRepository.findByMomentAndUser(momentId, userId);

  // Deux pages de paiement ouvertes : le second paiement n'achète rien de plus.
  if (
    existingRegistration &&
    isConfirmedParticipation(existingRegistration.status) &&
    existingRegistration.paymentStatus === "PAID"
  ) {
    return rejectPayment("Participant already paid");
  }

  // Auto-join Circle if not already a member. Avant l'inscription : une fois celle-ci
  // créée, un événement rejoué s'arrête à la garde d'idempotence, sans revenir ici.
  const membership = await circleRepository.findMembership(circleId, userId);
  if (!membership) {
    await circleRepository.addMembership(circleId, userId, "PLAYER");
  }

  // Create or update the Registration with PAID status
  // Cases: (1) no existing registration → create
  //        (2) existing CANCELLED registration → reactivate
  //        (3) existing active registration (e.g. Host auto-inscription) → update paymentStatus
  let registration;
  if (existingRegistration) {
    registration = await registrationRepository.update(existingRegistration.id, {
      status: "REGISTERED",
      paymentStatus: "PAID",
      stripePaymentIntentId: paymentIntentId || null,
      stripeAccountId: accountId,
      stripeReceiptUrl: receiptUrl || null,
      cancelledAt: null,
    });
  } else {
    registration = await registrationRepository.create({
      momentId,
      userId,
      status: "REGISTERED",
      paymentStatus: "PAID",
      stripePaymentIntentId: paymentIntentId || null,
      stripeAccountId: accountId,
      stripeReceiptUrl: receiptUrl || null,
    });
  }

  return { handled: true, registration };
}

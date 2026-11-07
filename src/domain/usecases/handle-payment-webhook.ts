import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { PaymentService, RefundParams } from "@/domain/ports/services/payment-service";
import type { Registration } from "@/domain/models/registration";
import { StripeRefundFailedError } from "@/domain/errors";

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

type HandlePaymentWebhookResult =
  | { handled: true; registration: Registration }
  | { handled: false; reason: string };

/** Un refus remonte en erreur : la route répond 500 et Stripe rejoue l'événement. */
async function refundOrThrow(paymentService: PaymentService, params: RefundParams): Promise<void> {
  const { status } = await paymentService.refund(params);
  if (status === "failed") {
    throw new StripeRefundFailedError(params.paymentIntentId);
  }
}

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

  // Load moment to check capacity
  const moment = await momentRepository.findById(momentId);
  if (!moment) {
    return { handled: false, reason: `Moment not found: ${momentId}` };
  }

  // Le paiement doit être arrivé sur le compte de cette Communauté : sinon, pas
  // d'inscription, et l'argent retourne au Participant.
  const circle = await circleRepository.findById(moment.circleId);
  if (circle?.stripeConnectAccountId !== accountId) {
    if (paymentIntentId) {
      await refundOrThrow(paymentService, { paymentIntentId, accountId });
    }
    return { handled: false, reason: "Payment on another account — payment refunded" };
  }

  // Race condition: check capacity — if full, refund and return
  if (moment.capacity !== null) {
    const activeCount = await registrationRepository.countActiveByMomentId(momentId);
    if (activeCount >= moment.capacity) {
      // Event is full — refund the payment
      if (paymentIntentId) {
        await refundOrThrow(paymentService, { paymentIntentId, accountId });
      }
      return { handled: false, reason: "Event is full — payment refunded" };
    }
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
  const existingRegistration = await registrationRepository.findByMomentAndUser(momentId, userId);
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

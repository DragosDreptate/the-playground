import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { PaymentService, PaymentEvent } from "@/domain/ports/services/payment-service";
import type { Registration } from "@/domain/models/registration";

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

export async function handlePaymentWebhook(
  input: HandlePaymentWebhookInput,
  deps: HandlePaymentWebhookDeps
): Promise<HandlePaymentWebhookResult> {
  const { paymentService, momentRepository, circleRepository, registrationRepository } = deps;

  // Parse and verify the webhook event
  const event = await paymentService.handleWebhookEvent(input.payload, input.signature);

  if (event.type !== "checkout_completed") {
    return { handled: false, reason: `Ignored event type: ${event.type}` };
  }

  const { userId, momentId, circleId, paymentIntentId, receiptUrl } = event;

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

  // Race condition: check capacity — if full, refund and return
  if (moment.capacity !== null) {
    const registered = await registrationRepository.countByMomentIdAndStatus(momentId, "REGISTERED");
    const checkedIn = await registrationRepository.countByMomentIdAndStatus(momentId, "CHECKED_IN");
    if (registered + checkedIn >= moment.capacity) {
      // Event is full — refund the payment
      if (paymentIntentId) {
        await paymentService.refund(paymentIntentId);
      }
      return { handled: false, reason: "Event is full — payment refunded" };
    }
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
      stripeReceiptUrl: receiptUrl || null,
    });
  }

  // Auto-join Circle if not already a member
  const membership = await circleRepository.findMembership(circleId, userId);
  if (!membership) {
    await circleRepository.addMembership(circleId, userId, "PLAYER");
  }

  return { handled: true, registration };
}

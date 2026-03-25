import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type {
  PaymentService,
  CheckoutSessionResult,
} from "@/domain/ports/services/payment-service";
import type { User } from "@/domain/models/user";
import {
  MomentNotFoundError,
  MomentNotOpenForRegistrationError,
  AlreadyRegisteredError,
} from "@/domain/errors";
import { StripeConnectNotActiveError } from "@/domain/errors";
import { InvalidPriceError } from "@/domain/errors";

type CreateCheckoutSessionInput = {
  momentId: string;
  user: User;
  successUrl: string;
  cancelUrl: string;
};

type CreateCheckoutSessionDeps = {
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
  registrationRepository: RegistrationRepository;
  paymentService: PaymentService;
};

export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
  deps: CreateCheckoutSessionDeps
): Promise<CheckoutSessionResult> {
  const { momentRepository, circleRepository, registrationRepository, paymentService } = deps;

  // Load moment
  const moment = await momentRepository.findById(input.momentId);
  if (!moment) {
    throw new MomentNotFoundError(input.momentId);
  }

  // Must be published
  if (moment.status !== "PUBLISHED") {
    throw new MomentNotOpenForRegistrationError(input.momentId);
  }

  // Must be a paid event
  if (moment.price <= 0) {
    throw new InvalidPriceError();
  }

  // Circle must have Stripe Connect active
  const circle = await circleRepository.findById(moment.circleId);
  if (!circle?.stripeConnectAccountId) {
    throw new StripeConnectNotActiveError(moment.circleId);
  }

  // Check Stripe account is active
  const connectStatus = await paymentService.getConnectAccountStatus(
    circle.stripeConnectAccountId
  );
  if (connectStatus !== "active") {
    throw new StripeConnectNotActiveError(moment.circleId);
  }

  // Check not already registered
  const existing = await registrationRepository.findByMomentAndUser(
    input.momentId,
    input.user.id
  );
  if (existing && existing.status !== "CANCELLED") {
    throw new AlreadyRegisteredError(input.momentId, input.user.id);
  }

  // Check capacity (no waitlist for paid events)
  if (moment.capacity !== null) {
    const activeCount = await registrationRepository.countActiveByMomentId(input.momentId);
    if (activeCount >= moment.capacity) {
      throw new MomentNotOpenForRegistrationError(input.momentId);
    }
  }

  // Create Stripe Checkout Session
  return paymentService.createCheckoutSession({
    moment,
    user: input.user,
    circle,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
  });
}

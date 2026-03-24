import type { Moment, LocationType, MomentStatus, CoverImageAttribution } from "@/domain/models/moment";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { PaymentService } from "@/domain/ports/services/payment-service";
import { refundRegistration } from "./refund-registration";
import {
  MomentNotFoundError,
  MomentPastDateError,
  UnauthorizedMomentActionError,
  InvalidPriceError,
  PaidMomentRequiresStripeError,
  PriceLockedError,
  CannotMakePaidWithRegistrationsError,
} from "@/domain/errors";

type UpdateMomentInput = {
  momentId: string;
  userId: string;
  title?: string;
  description?: string;
  coverImage?: string | null;
  coverImageAttribution?: CoverImageAttribution | null;
  startsAt?: Date;
  endsAt?: Date | null;
  locationType?: LocationType;
  locationName?: string | null;
  locationAddress?: string | null;
  videoLink?: string | null;
  capacity?: number | null;
  price?: number;
  currency?: string;
  status?: MomentStatus;
  refundable?: boolean;
  requiresApproval?: boolean;
};

type UpdateMomentDeps = {
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
  registrationRepository?: RegistrationRepository;
  paymentService?: PaymentService;
};

type UpdateMomentResult = {
  moment: Moment;
};

export async function updateMoment(
  input: UpdateMomentInput,
  deps: UpdateMomentDeps
): Promise<UpdateMomentResult> {
  const { momentRepository, circleRepository } = deps;

  const existing = await momentRepository.findById(input.momentId);

  if (!existing) {
    throw new MomentNotFoundError(input.momentId);
  }

  const membership = await circleRepository.findMembership(
    existing.circleId,
    input.userId
  );

  if (!membership || membership.role !== "HOST") {
    throw new UnauthorizedMomentActionError();
  }

  // Price validation: free (0) or at least 50 cents (Stripe minimum)
  if (input.price !== undefined && input.price !== 0 && input.price < 50) {
    throw new InvalidPriceError();
  }

  // Paid events require Stripe Connect on the Circle
  if (input.price !== undefined && input.price > 0) {
    const circle = await circleRepository.findById(existing.circleId);
    if (!circle?.stripeConnectAccountId) {
      throw new PaidMomentRequiresStripeError(existing.circleId);
    }
  }

  // Price locking rules (only when price is being changed)
  if (input.price !== undefined && input.price !== existing.price && deps.registrationRepository) {
    const registeredCount = await deps.registrationRepository.countByMomentIdAndStatus(
      input.momentId,
      "REGISTERED"
    );
    const checkedInCount = await deps.registrationRepository.countByMomentIdAndStatus(
      input.momentId,
      "CHECKED_IN"
    );
    const hasRegistrations = registeredCount + checkedInCount > 0;

    if (hasRegistrations) {
      const wasFree = existing.price === 0;
      const becomingPaid = input.price > 0;
      const wasPaid = existing.price > 0;
      const becomingFree = input.price === 0;
      const priceChanging = wasPaid && becomingPaid && input.price !== existing.price;

      // Gratuit → payant avec inscrits : interdit
      if (wasFree && becomingPaid) {
        throw new CannotMakePaidWithRegistrationsError();
      }

      // Payant → payant (changement de prix) avec inscrits : interdit
      if (priceChanging) {
        throw new PriceLockedError();
      }

      // Payant → gratuit avec inscrits payants : autorisé, remboursement batch
      if (wasPaid && becomingFree && deps.paymentService) {
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
    }
  }

  if (input.startsAt !== undefined && input.startsAt < new Date()) {
    throw new MomentPastDateError();
  }

  const { momentId: _, userId: __, ...updates } = input;

  const moment = await momentRepository.update(input.momentId, updates);

  // D13: auto-reject PENDING_APPROVAL registrations when moment is cancelled
  if (input.status === "CANCELLED" && deps.registrationRepository) {
    await deps.registrationRepository.rejectAllPendingApprovals(input.momentId);
  }

  return { moment };
}

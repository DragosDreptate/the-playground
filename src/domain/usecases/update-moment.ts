import type { Moment, LocationType, MomentStatus, CoverImageAttribution } from "@/domain/models/moment";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import {
  MomentNotFoundError,
  MomentPastDateError,
  UnauthorizedMomentActionError,
  InvalidPriceError,
  PaidMomentRequiresStripeError,
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
  requiresApproval?: boolean;
};

type UpdateMomentDeps = {
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
  registrationRepository?: RegistrationRepository;
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

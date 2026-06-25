import type { Moment, LocationType, CoverImageAttribution } from "@/domain/models/moment";
import { isActiveOrganizer } from "@/domain/models/circle";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { PaymentService } from "@/domain/ports/services/payment-service";
import { refundAllPaidRegistrations } from "./refund-all-paid-registrations";
import {
  MomentNotFoundError,
  MomentPastDateError,
  UnauthorizedMomentActionError,
  InvalidPriceError,
  PaidMomentRequiresStripeError,
  PriceLockedError,
  CannotMakePaidWithRegistrationsError,
  PaidMomentCannotRequireApprovalError,
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

  if (!isActiveOrganizer(membership)) {
    throw new UnauthorizedMomentActionError();
  }

  // Événement annulé : non modifiable (l'UI ne propose que Supprimer). Garde-fou
  // de défense en profondeur contre un POST direct sur l'URL d'édition, calqué
  // sur addComment.
  if (existing.status === "CANCELLED") {
    throw new MomentNotFoundError(input.momentId);
  }

  // Événement passé : seuls le lieu et la description restent modifiables.
  // Toute autre modification soumise (titre, dates, capacité, prix, validation,
  // visuels) est ignorée silencieusement. Règle métier centralisée ici pour
  // protéger aussi les appels directs qui contourneraient le formulaire.
  const safeInput: UpdateMomentInput =
    existing.status === "PAST"
      ? {
          momentId: input.momentId,
          userId: input.userId,
          description: input.description,
          locationType: input.locationType,
          locationName: input.locationName,
          locationAddress: input.locationAddress,
          videoLink: input.videoLink,
        }
      : input;

  // Price validation: free (0) or at least 50 cents (Stripe minimum)
  if (safeInput.price !== undefined && safeInput.price !== 0 && safeInput.price < 50) {
    throw new InvalidPriceError();
  }

  // Paid events cannot require approval (check resulting state)
  const resultingPrice = safeInput.price ?? existing.price;
  const resultingApproval = safeInput.requiresApproval ?? existing.requiresApproval;
  if (resultingPrice > 0 && resultingApproval) {
    throw new PaidMomentCannotRequireApprovalError();
  }

  // Paid events require Stripe Connect on the Circle
  if (safeInput.price !== undefined && safeInput.price > 0) {
    const circle = await circleRepository.findById(existing.circleId);
    if (!circle?.stripeConnectAccountId) {
      throw new PaidMomentRequiresStripeError(existing.circleId);
    }
  }

  // Price locking rules (only when price is being changed)
  // activeCount > 1 because the host is always auto-registered (count = 1 minimum)
  if (safeInput.price !== undefined && safeInput.price !== existing.price && deps.registrationRepository) {
    const activeCount = await deps.registrationRepository.countActiveByMomentId(safeInput.momentId);
    const hasRegistrations = activeCount > 1;

    if (hasRegistrations) {
      const wasFree = existing.price === 0;
      const becomingPaid = safeInput.price > 0;
      const wasPaid = existing.price > 0;
      const becomingFree = safeInput.price === 0;
      const priceChanging = wasPaid && becomingPaid && safeInput.price !== existing.price;

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
        await refundAllPaidRegistrations(existing, {
          registrationRepository: deps.registrationRepository,
          paymentService: deps.paymentService,
        });
      }
    }
  }

  if (safeInput.startsAt !== undefined && safeInput.startsAt < new Date()) {
    throw new MomentPastDateError();
  }

  const { momentId: _, userId: __, ...updates } = safeInput;

  const moment = await momentRepository.update(safeInput.momentId, updates);

  return { moment };
}

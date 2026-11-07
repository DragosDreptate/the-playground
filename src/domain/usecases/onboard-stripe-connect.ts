import { isActivePrimaryHost } from "@/domain/models/circle";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { RegistrationRepository } from "@/domain/ports/repositories/registration-repository";
import type { PaymentService, ConnectAccountStatus } from "@/domain/ports/services/payment-service";
import {
  CircleNotFoundError,
  StripeConnectCancelBlockedError,
  UnauthorizedCircleActionError,
} from "@/domain/errors";

type OnboardStripeConnectInput = {
  circleId: string;
  userId: string;
  returnUrl: string;
};

type OnboardStripeConnectDeps = {
  circleRepository: CircleRepository;
  paymentService: PaymentService;
};

type OnboardStripeConnectResult = {
  onboardingUrl: string;
};

export async function onboardStripeConnect(
  input: OnboardStripeConnectInput,
  deps: OnboardStripeConnectDeps
): Promise<OnboardStripeConnectResult> {
  const circle = await deps.circleRepository.findById(input.circleId);
  if (!circle) {
    throw new CircleNotFoundError(input.circleId);
  }

  const membership = await deps.circleRepository.findMembership(
    input.circleId,
    input.userId
  );
  if (!isActivePrimaryHost(membership)) {
    throw new UnauthorizedCircleActionError(input.userId, input.circleId);
  }

  let accountId = circle.stripeConnectAccountId;

  // If no account yet, create one
  if (!accountId) {
    const result = await deps.paymentService.createConnectAccount(circle);
    accountId = result.accountId;
    await deps.circleRepository.update(input.circleId, {
      stripeConnectAccountId: accountId,
    });
  }

  // Check if account is already fully active
  const status = await deps.paymentService.getConnectAccountStatus(accountId);
  if (status === "active") {
    // Already onboarded — return the login link instead
    const { url } = await deps.paymentService.createLoginLink(accountId);
    return { onboardingUrl: url };
  }

  // Generate onboarding link (for pending/restricted/disabled accounts)
  const { url } = await deps.paymentService.createOnboardingLink(
    accountId,
    input.returnUrl
  );
  return { onboardingUrl: url };
}

// --- Get Connect status ---

type GetStripeConnectStatusInput = {
  circleId: string;
  userId: string;
};

type GetStripeConnectStatusDeps = {
  circleRepository: CircleRepository;
  paymentService: PaymentService;
};

type GetStripeConnectStatusResult = {
  hasAccount: boolean;
  status: ConnectAccountStatus | null;
};

export async function getStripeConnectStatus(
  input: GetStripeConnectStatusInput,
  deps: GetStripeConnectStatusDeps
): Promise<GetStripeConnectStatusResult> {
  const circle = await deps.circleRepository.findById(input.circleId);
  if (!circle) {
    throw new CircleNotFoundError(input.circleId);
  }

  const membership = await deps.circleRepository.findMembership(
    input.circleId,
    input.userId
  );
  if (!isActivePrimaryHost(membership)) {
    throw new UnauthorizedCircleActionError(input.userId, input.circleId);
  }

  if (!circle.stripeConnectAccountId) {
    return { hasAccount: false, status: null };
  }

  const status = await deps.paymentService.getConnectAccountStatus(
    circle.stripeConnectAccountId
  );
  return { hasAccount: true, status };
}

// --- Cancel Connect activation ---

type CancelStripeConnectInput = {
  circleId: string;
  userId: string;
};

type CancelStripeConnectDeps = {
  circleRepository: CircleRepository;
  momentRepository: MomentRepository;
  registrationRepository: RegistrationRepository;
};

/**
 * Détache le compte de la Communauté. L'Organisateur n'accède à son tableau de
 * bord Express que depuis The Playground : on refuse dès qu'un paiement a eu lieu
 * sur ce compte, ou qu'un événement payant publié en dépend.
 */
export async function cancelStripeConnect(
  input: CancelStripeConnectInput,
  deps: CancelStripeConnectDeps
): Promise<void> {
  const circle = await deps.circleRepository.findById(input.circleId);
  if (!circle) {
    throw new CircleNotFoundError(input.circleId);
  }

  const membership = await deps.circleRepository.findMembership(
    input.circleId,
    input.userId
  );
  if (!isActivePrimaryHost(membership)) {
    throw new UnauthorizedCircleActionError(input.userId, input.circleId);
  }

  const accountId = circle.stripeConnectAccountId;
  if (!accountId) return;

  const moments = await deps.momentRepository.findByCircleId(input.circleId);
  const hasPublishedPaidMoment = moments.some(
    (moment) => moment.status === "PUBLISHED" && moment.price > 0
  );
  if (
    hasPublishedPaidMoment ||
    (await deps.registrationRepository.hasPaymentsOnStripeAccount(accountId))
  ) {
    throw new StripeConnectCancelBlockedError(input.circleId);
  }

  await deps.circleRepository.update(input.circleId, {
    stripeConnectAccountId: null,
  });
}

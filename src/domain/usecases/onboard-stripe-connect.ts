import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { PaymentService, ConnectAccountStatus } from "@/domain/ports/services/payment-service";
import { CircleNotFoundError, UnauthorizedCircleActionError } from "@/domain/errors";

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
  if (!membership || membership.role !== "HOST") {
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
  if (!membership || membership.role !== "HOST") {
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

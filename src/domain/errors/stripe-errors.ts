import { DomainError } from "./domain-error";

export const STRIPE_ERROR_CODES = {
  ConnectNotActive: "STRIPE_CONNECT_NOT_ACTIVE",
  ConnectCancelBlocked: "STRIPE_CONNECT_CANCEL_BLOCKED",
  RefundFailed: "STRIPE_REFUND_FAILED",
  MomentRefundsFailed: "MOMENT_REFUNDS_FAILED",
  CircleHasUnrefundedPayments: "CIRCLE_HAS_UNREFUNDED_PAYMENTS",
} as const;

export class StripeConnectNotActiveError extends DomainError {
  readonly code = STRIPE_ERROR_CODES.ConnectNotActive;

  constructor(circleId: string) {
    super(
      `Stripe Connect is not active for circle ${circleId}`
    );
  }
}

export class StripeConnectCancelBlockedError extends DomainError {
  readonly code = STRIPE_ERROR_CODES.ConnectCancelBlocked;

  constructor(circleId: string) {
    super(
      `Stripe Connect cannot be cancelled for circle ${circleId}: it has payments or a published paid event`
    );
  }
}

export class InvalidWebhookSignatureError extends DomainError {
  readonly code = "STRIPE_WEBHOOK_SIGNATURE_INVALID";

  constructor() {
    super("Invalid Stripe webhook signature");
  }
}

export class StripeRefundFailedError extends DomainError {
  readonly code = STRIPE_ERROR_CODES.RefundFailed;

  constructor(paymentIntentId: string) {
    super(`Stripe refused the refund of payment ${paymentIntentId}`);
  }
}

/** Remboursements groupés refusés : l'opération est annulée, les Participants à traiter sont listés. */
export class MomentRefundsFailedError extends DomainError {
  readonly code = STRIPE_ERROR_CODES.MomentRefundsFailed;

  constructor(
    readonly momentId: string,
    readonly participantUserIds: string[]
  ) {
    super(`${participantUserIds.length} refund(s) failed for moment ${momentId}`);
  }
}

export class CircleHasUnrefundedPaymentsError extends DomainError {
  readonly code = STRIPE_ERROR_CODES.CircleHasUnrefundedPayments;

  constructor(circleId: string) {
    super(`Circle ${circleId} still has paid registrations that were not refunded`);
  }
}

export class StripeConnectAlreadyActiveError extends DomainError {
  readonly code = "STRIPE_CONNECT_ALREADY_ACTIVE";

  constructor(circleId: string) {
    super(
      `Stripe Connect is already active for circle ${circleId}`
    );
  }
}

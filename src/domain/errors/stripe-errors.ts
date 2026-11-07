import { DomainError } from "./domain-error";

export const STRIPE_ERROR_CODES = {
  ConnectNotActive: "STRIPE_CONNECT_NOT_ACTIVE",
  ConnectCancelBlocked: "STRIPE_CONNECT_CANCEL_BLOCKED",
  RefundFailed: "STRIPE_REFUND_FAILED",
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

export class StripeConnectAlreadyActiveError extends DomainError {
  readonly code = "STRIPE_CONNECT_ALREADY_ACTIVE";

  constructor(circleId: string) {
    super(
      `Stripe Connect is already active for circle ${circleId}`
    );
  }
}

import { DomainError } from "./domain-error";

export const STRIPE_ERROR_CODES = {
  ConnectNotActive: "STRIPE_CONNECT_NOT_ACTIVE",
} as const;

export class StripeConnectNotActiveError extends DomainError {
  readonly code = STRIPE_ERROR_CODES.ConnectNotActive;

  constructor(circleId: string) {
    super(
      `Stripe Connect is not active for circle ${circleId}`
    );
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

import { DomainError } from "./domain-error";

export class StripeConnectNotActiveError extends DomainError {
  readonly code = "STRIPE_CONNECT_NOT_ACTIVE";

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

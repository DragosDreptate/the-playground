import { DomainError } from "./domain-error";

export class MomentNotFoundError extends DomainError {
  readonly code = "MOMENT_NOT_FOUND";

  constructor(identifier: string) {
    super(`Moment not found: ${identifier}`);
  }
}

export class MomentSlugAlreadyExistsError extends DomainError {
  readonly code = "MOMENT_SLUG_EXISTS";

  constructor(slug: string) {
    super(`Moment slug already exists: ${slug}`);
  }
}

export class UnauthorizedMomentActionError extends DomainError {
  readonly code = "MOMENT_UNAUTHORIZED";

  constructor() {
    super("You are not authorized to perform this action on this Moment");
  }
}

export class MomentPastDateError extends DomainError {
  readonly code = "MOMENT_PAST_DATE";

  constructor() {
    super("The event start date cannot be in the past");
  }
}

export class MomentAlreadyPublishedError extends DomainError {
  readonly code = "MOMENT_ALREADY_PUBLISHED";

  constructor(momentId: string) {
    super(`Moment is already published: ${momentId}`);
  }
}

export class InvalidPriceError extends DomainError {
  readonly code = "INVALID_PRICE";

  constructor() {
    super("Price must be 0 (free) or at least 50 cents (0.50 EUR)");
  }
}

export class PaidMomentRequiresStripeError extends DomainError {
  readonly code = "PAID_MOMENT_REQUIRES_STRIPE";

  constructor(circleId: string) {
    super(
      `Cannot set a price without Stripe Connect activated on circle ${circleId}`
    );
  }
}

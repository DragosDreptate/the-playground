import { DomainError } from "./domain-error";

export class MomentNotOpenForRegistrationError extends DomainError {
  readonly code = "MOMENT_NOT_OPEN";

  constructor(momentId: string) {
    super(`Moment is not open for registration: ${momentId}`);
  }
}

export class PaidMomentNotSupportedError extends DomainError {
  readonly code = "PAID_MOMENT_NOT_SUPPORTED";

  constructor(momentId: string) {
    super(`Paid Moments are not yet supported: ${momentId}`);
  }
}

export class AlreadyRegisteredError extends DomainError {
  readonly code = "ALREADY_REGISTERED";

  constructor(momentId: string, userId: string) {
    super(`User ${userId} is already registered for Moment ${momentId}`);
  }
}

export class RegistrationNotFoundError extends DomainError {
  readonly code = "REGISTRATION_NOT_FOUND";

  constructor(identifier: string) {
    super(`Registration not found: ${identifier}`);
  }
}

export class UnauthorizedRegistrationActionError extends DomainError {
  readonly code = "REGISTRATION_UNAUTHORIZED";

  constructor() {
    super("You are not authorized to perform this action on this registration");
  }
}

export class HostCannotCancelRegistrationError extends DomainError {
  readonly code = "HOST_CANNOT_CANCEL";

  constructor() {
    super("A Host cannot cancel their registration for a Moment they organize");
  }
}

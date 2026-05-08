import { DomainError } from "./domain-error";

export class NoHostsToContactError extends DomainError {
  readonly code = "NO_HOSTS_TO_CONTACT";

  constructor(circleId: string) {
    super(`Circle ${circleId} has no organizers to contact`);
  }
}

export class MomentNotInCircleError extends DomainError {
  readonly code = "MOMENT_NOT_IN_CIRCLE";

  constructor(momentId: string, circleId: string) {
    super(`Moment ${momentId} does not belong to circle ${circleId}`);
  }
}

export class ContactMessageTooShortError extends DomainError {
  readonly code = "CONTACT_MESSAGE_TOO_SHORT";

  constructor(min: number) {
    super(`Contact message must be at least ${min} characters long`);
  }
}

export class ContactMessageTooLongError extends DomainError {
  readonly code = "CONTACT_MESSAGE_TOO_LONG";

  constructor(max: number) {
    super(`Contact message must be at most ${max} characters long`);
  }
}

export class ContactHostsRateLimitedError extends DomainError {
  readonly code = "CONTACT_HOSTS_RATE_LIMITED";

  constructor() {
    super("Too many contact messages sent in the last hour");
  }
}

export class SenderEmailMissingError extends DomainError {
  readonly code = "SENDER_EMAIL_MISSING";

  constructor(userId: string) {
    super(`User ${userId} has no email and cannot contact organizers`);
  }
}

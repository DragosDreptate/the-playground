import { DomainError } from "./domain-error";

export const CONTACT_ERROR_CODES = {
  NoHostsToContact: "NO_HOSTS_TO_CONTACT",
  MomentNotInCircle: "MOMENT_NOT_IN_CIRCLE",
  ContactMessageTooShort: "CONTACT_MESSAGE_TOO_SHORT",
  ContactMessageTooLong: "CONTACT_MESSAGE_TOO_LONG",
  ContactHostsRateLimited: "CONTACT_HOSTS_RATE_LIMITED",
  ContactHostsAccountTooNew: "CONTACT_HOSTS_ACCOUNT_TOO_NEW",
  SenderEmailMissing: "SENDER_EMAIL_MISSING",
} as const;

export class NoHostsToContactError extends DomainError {
  readonly code = CONTACT_ERROR_CODES.NoHostsToContact;

  constructor(circleId: string) {
    super(`Circle ${circleId} has no organizers to contact`);
  }
}

export class MomentNotInCircleError extends DomainError {
  readonly code = CONTACT_ERROR_CODES.MomentNotInCircle;

  constructor(momentId: string, circleId: string) {
    super(`Moment ${momentId} does not belong to circle ${circleId}`);
  }
}

export class ContactMessageTooShortError extends DomainError {
  readonly code = CONTACT_ERROR_CODES.ContactMessageTooShort;

  constructor(min: number) {
    super(`Contact message must be at least ${min} characters long`);
  }
}

export class ContactMessageTooLongError extends DomainError {
  readonly code = CONTACT_ERROR_CODES.ContactMessageTooLong;

  constructor(max: number) {
    super(`Contact message must be at most ${max} characters long`);
  }
}

export class ContactHostsRateLimitedError extends DomainError {
  readonly code = CONTACT_ERROR_CODES.ContactHostsRateLimited;

  constructor() {
    super("Too many contact messages sent in the last hour");
  }
}

export class ContactHostsAccountTooNewError extends DomainError {
  readonly code = CONTACT_ERROR_CODES.ContactHostsAccountTooNew;

  constructor(minAgeHours: number) {
    super(
      `Account must be at least ${minAgeHours} hours old to contact organizers`
    );
  }
}

export class SenderEmailMissingError extends DomainError {
  readonly code = CONTACT_ERROR_CODES.SenderEmailMissing;

  constructor(userId: string) {
    super(`User ${userId} has no email and cannot contact organizers`);
  }
}

import { DomainError } from "./domain-error";

export class HostMessageSubjectInvalidError extends DomainError {
  readonly code = "HOST_MESSAGE_SUBJECT_INVALID";

  constructor(maxLength: number) {
    super(`Subject must be non-empty and at most ${maxLength} characters`);
  }
}

export class HostMessageBodyEmptyError extends DomainError {
  readonly code = "HOST_MESSAGE_BODY_EMPTY";

  constructor() {
    super("Message body cannot be empty");
  }
}

export class HostMessageBodyTooLongError extends DomainError {
  readonly code = "HOST_MESSAGE_BODY_TOO_LONG";

  constructor(maxLength: number) {
    super(`Message body exceeds ${maxLength} characters of text`);
  }
}

export class HostMessageNotAllowedOnDraftError extends DomainError {
  readonly code = "HOST_MESSAGE_DRAFT";

  constructor(momentId: string) {
    super(`Cannot send a host message on a draft Moment: ${momentId}`);
  }
}

export class HostMessageNoRecipientsError extends DomainError {
  readonly code = "HOST_MESSAGE_NO_RECIPIENTS";

  constructor(momentId: string, segment: string) {
    super(`No recipients for segment ${segment} on Moment ${momentId}`);
  }
}

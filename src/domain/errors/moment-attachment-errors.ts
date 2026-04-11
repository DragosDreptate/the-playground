import { DomainError } from "./domain-error";

export class AttachmentLimitReachedError extends DomainError {
  readonly code = "ATTACHMENT_LIMIT_REACHED";

  constructor(limit: number) {
    super(`Attachment limit reached (${limit} per event)`);
  }
}

export class AttachmentTooLargeError extends DomainError {
  readonly code = "ATTACHMENT_TOO_LARGE";

  constructor(maxBytes: number) {
    super(`Attachment too large (max ${maxBytes} bytes)`);
  }
}

export class AttachmentTypeNotAllowedError extends DomainError {
  readonly code = "ATTACHMENT_TYPE_NOT_ALLOWED";

  constructor(contentType: string) {
    super(`Attachment type not allowed: ${contentType}`);
  }
}

export class AttachmentNotFoundError extends DomainError {
  readonly code = "ATTACHMENT_NOT_FOUND";

  constructor(id: string) {
    super(`Attachment not found: ${id}`);
  }
}

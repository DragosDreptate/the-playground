import { DomainError } from "./domain-error";

export class CommentPhotoLimitReachedError extends DomainError {
  readonly code = "COMMENT_PHOTO_LIMIT_REACHED";

  constructor(limit: number) {
    super(`Comment photo limit reached (${limit} per comment)`);
  }
}

export class CommentPhotoTooLargeError extends DomainError {
  readonly code = "COMMENT_PHOTO_TOO_LARGE";

  constructor(maxBytes: number) {
    super(`Comment photo too large (max ${maxBytes} bytes)`);
  }
}

export class CommentPhotoTypeNotAllowedError extends DomainError {
  readonly code = "COMMENT_PHOTO_TYPE_NOT_ALLOWED";

  constructor(contentType: string) {
    super(`Comment photo type not allowed: ${contentType}`);
  }
}

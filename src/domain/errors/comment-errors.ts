import { DomainError } from "./domain-error";

export class CommentNotFoundError extends DomainError {
  readonly code = "COMMENT_NOT_FOUND";

  constructor(commentId: string) {
    super(`Comment not found: ${commentId}`);
  }
}

export class UnauthorizedCommentDeletionError extends DomainError {
  readonly code = "COMMENT_DELETION_UNAUTHORIZED";

  constructor() {
    super("You are not authorized to delete this comment");
  }
}

export class CommentContentEmptyError extends DomainError {
  readonly code = "COMMENT_CONTENT_EMPTY";

  constructor() {
    super("Comment content cannot be empty");
  }
}

export class CommentContentTooLongError extends DomainError {
  readonly code = "COMMENT_CONTENT_TOO_LONG";

  constructor(max: number) {
    super(`Comment content exceeds the maximum length of ${max} characters`);
  }
}

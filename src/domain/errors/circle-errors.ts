import { DomainError } from "./domain-error";

export class CircleNotFoundError extends DomainError {
  readonly code = "CIRCLE_NOT_FOUND";

  constructor(identifier: string) {
    super(`Circle not found: ${identifier}`);
  }
}

export class SlugAlreadyExistsError extends DomainError {
  readonly code = "SLUG_ALREADY_EXISTS";

  constructor(slug: string) {
    super(`Slug already exists: ${slug}`);
  }
}

export class UnauthorizedCircleActionError extends DomainError {
  readonly code = "UNAUTHORIZED_CIRCLE_ACTION";

  constructor(userId: string, circleId: string) {
    super(
      `User ${userId} is not authorized to perform this action on circle ${circleId}`
    );
  }
}

export class AlreadyFollowingCircleError extends DomainError {
  readonly code = "ALREADY_FOLLOWING";

  constructor() {
    super("Already following this circle");
  }
}

export class NotFollowingCircleError extends DomainError {
  readonly code = "NOT_FOLLOWING";

  constructor() {
    super("Not following this circle");
  }
}

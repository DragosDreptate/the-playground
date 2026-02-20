import { DomainError } from "./domain-error";

export class UserNotFoundError extends DomainError {
  readonly code = "USER_NOT_FOUND";

  constructor(identifier: string) {
    super(`User not found: ${identifier}`);
  }
}

import { DomainError } from "./domain-error";

export const USER_ERROR_CODES = {
  BioTooLong: "BIO_TOO_LONG",
} as const;

export class UserNotFoundError extends DomainError {
  readonly code = "USER_NOT_FOUND";

  constructor(identifier: string) {
    super(`User not found: ${identifier}`);
  }
}

export class BioTooLongError extends DomainError {
  readonly code = USER_ERROR_CODES.BioTooLong;

  constructor(max: number) {
    super(`Bio must be at most ${max} characters long`);
  }
}

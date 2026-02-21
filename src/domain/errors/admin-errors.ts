import { DomainError } from "./domain-error";

export class AdminUnauthorizedError extends DomainError {
  readonly code = "ADMIN_UNAUTHORIZED";
  constructor() {
    super("Admin access required");
  }
}

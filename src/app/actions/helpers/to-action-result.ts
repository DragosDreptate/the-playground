import * as Sentry from "@sentry/nextjs";
import { DomainError } from "@/domain/errors/domain-error";
import type { ActionResult } from "../types";

/**
 * Wraps a server action body in the canonical try/catch that maps:
 * - any throw of a `DomainError` → `{ success: false, error, code }`
 *   using the domain error's own message and `code` field
 * - any other throw → Sentry capture + `{ success: false, error: fallbackError, code: "INTERNAL_ERROR" }`
 *
 * Usage: auth/input-validation guards stay OUTSIDE the lambda. Side effects
 * that must run before the return (e.g. `revalidatePath`, `after()`,
 * fire-and-forget promises) live INSIDE the lambda.
 *
 * @param fn the body of the action that produces the success payload
 * @param fallbackError user-facing message for non-domain errors (defaults to "Une erreur est survenue")
 */
export async function toActionResult<T>(
  fn: () => Promise<T>,
  fallbackError = "Une erreur est survenue"
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (err) {
    if (err instanceof DomainError) {
      return { success: false, error: err.message, code: err.code };
    }
    Sentry.captureException(err);
    return { success: false, error: fallbackError, code: "INTERNAL_ERROR" };
  }
}

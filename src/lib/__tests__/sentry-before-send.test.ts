import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";

import { dropExpectedAuthRejections } from "@/lib/sentry-before-send";

const exceptionEvent = (message: string, over: Partial<ErrorEvent> = {}) =>
  ({
    level: "error",
    exception: { values: [{ type: "Error", value: message }] },
    ...over,
  }) as ErrorEvent;

const ACCESS_DENIED =
  "AccessDenied. Read more at https://errors.authjs.dev#accessdenied";
const VERIFICATION =
  "Verification. Read more at https://errors.authjs.dev#verification";

describe("dropExpectedAuthRejections", () => {
  describe("given le doublon error-level auto-capté par le SDK (sans tag auth)", () => {
    it.each([ACCESS_DENIED, VERIFICATION])("should droper %s", (message) => {
      expect(dropExpectedAuthRejections(exceptionEvent(message))).toBeNull();
    });
  });

  describe("given une exception AccessDenied taggée context=auth (re-capture logger.error)", () => {
    it("should la droper : doublon du captureMessage de rejet (avec identité)", () => {
      const event = exceptionEvent(ACCESS_DENIED, {
        level: "warning",
        tags: { context: "auth", error_code: "AccessDenied" },
      });
      expect(dropExpectedAuthRejections(event)).toBeNull();
    });
  });

  describe("given une capture délibérée taggée context=auth", () => {
    it("should conserver une Verification context=auth (signal d'abus préservé)", () => {
      const event = exceptionEvent(VERIFICATION, {
        level: "warning",
        tags: { context: "auth", error_code: "Verification" },
      });
      expect(dropExpectedAuthRejections(event)).toBe(event);
    });

    it("should conserver le captureMessage de rejet (sans exception, tag sign_in_blocked)", () => {
      const event = {
        level: "warning",
        message: "auth: connexion bloquée [domain] nms.asia",
        tags: { context: "auth", auth_event: "sign_in_blocked" },
      } as unknown as ErrorEvent;
      expect(dropExpectedAuthRejections(event)).toBe(event);
    });

    it("should conserver un message-event sans exception (page /auth/error)", () => {
      const event = {
        level: "warning",
        message: "auth-error-page: AccessDenied",
        tags: { context: "auth" },
      } as unknown as ErrorEvent;
      expect(dropExpectedAuthRejections(event)).toBe(event);
    });
  });

  describe("given une vraie erreur à ne pas masquer", () => {
    it("should conserver une exception sans hash authjs attendu", () => {
      const event = exceptionEvent("TypeError: cannot read properties of undefined");
      expect(dropExpectedAuthRejections(event)).toBe(event);
    });

    it("should conserver un CallbackRouteError (hash non attendu, vrai bug d'auth)", () => {
      const event = exceptionEvent(
        "Read more at https://errors.authjs.dev#callbackrouteerror"
      );
      expect(dropExpectedAuthRejections(event)).toBe(event);
    });

    it("should conserver un event sans exception ni tag", () => {
      const event = { level: "error", message: "boom" } as unknown as ErrorEvent;
      expect(dropExpectedAuthRejections(event)).toBe(event);
    });
  });
});

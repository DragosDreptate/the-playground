import { describe, it, expect, vi } from "vitest";
import { refundRegistration } from "../refund-registration";
import { createMockRegistrationRepository, makeRegistration } from "./helpers/mock-registration-repository";
import { makeMoment } from "./helpers/mock-moment-repository";
import { createMockPaymentService } from "./helpers/mock-payment-service";

describe("refundRegistration", () => {
  describe("given a PAID registration on a refundable event", () => {
    it("should call Stripe refund and update paymentStatus to REFUNDED", async () => {
      const registration = makeRegistration({
        paymentStatus: "PAID",
        stripePaymentIntentId: "pi_test_123",
      });
      const moment = makeMoment({ price: 1500, refundable: true });
      const registrationRepo = createMockRegistrationRepository();
      const paymentService = createMockPaymentService();

      const result = await refundRegistration(
        { registration, moment },
        { registrationRepository: registrationRepo, paymentService }
      );

      expect(result.refunded).toBe(true);
      expect(paymentService.refund).toHaveBeenCalledWith("pi_test_123");
      expect(registrationRepo.update).toHaveBeenCalledWith(registration.id, {
        paymentStatus: "REFUNDED",
      });
    });
  });

  describe("given a PAID registration on a non-refundable event", () => {
    it("should NOT refund", async () => {
      const registration = makeRegistration({
        paymentStatus: "PAID",
        stripePaymentIntentId: "pi_test_123",
      });
      const moment = makeMoment({ price: 1500, refundable: false });
      const paymentService = createMockPaymentService();
      const registrationRepo = createMockRegistrationRepository();

      const result = await refundRegistration(
        { registration, moment },
        { registrationRepository: registrationRepo, paymentService }
      );

      expect(result.refunded).toBe(false);
      expect(paymentService.refund).not.toHaveBeenCalled();
    });
  });

  describe("given a PAID registration on a non-refundable event with force=true (Organisateur cancellation)", () => {
    it("should refund regardless of refundable setting", async () => {
      const registration = makeRegistration({
        paymentStatus: "PAID",
        stripePaymentIntentId: "pi_test_456",
      });
      const moment = makeMoment({ price: 1500, refundable: false });
      const paymentService = createMockPaymentService();
      const registrationRepo = createMockRegistrationRepository();

      const result = await refundRegistration(
        { registration, moment, force: true },
        { registrationRepository: registrationRepo, paymentService }
      );

      expect(result.refunded).toBe(true);
      expect(paymentService.refund).toHaveBeenCalledWith("pi_test_456");
    });
  });

  describe("given a registration with paymentStatus=NONE (free event)", () => {
    it("should NOT call Stripe refund", async () => {
      const registration = makeRegistration({
        paymentStatus: "NONE",
        stripePaymentIntentId: null,
      });
      const moment = makeMoment({ price: 0, refundable: true });
      const paymentService = createMockPaymentService();
      const registrationRepo = createMockRegistrationRepository();

      const result = await refundRegistration(
        { registration, moment },
        { registrationRepository: registrationRepo, paymentService }
      );

      expect(result.refunded).toBe(false);
      expect(paymentService.refund).not.toHaveBeenCalled();
    });
  });

  describe("given a registration already REFUNDED", () => {
    it("should NOT refund again", async () => {
      const registration = makeRegistration({
        paymentStatus: "REFUNDED",
        stripePaymentIntentId: "pi_test_789",
      });
      const moment = makeMoment({ price: 1500, refundable: true });
      const paymentService = createMockPaymentService();
      const registrationRepo = createMockRegistrationRepository();

      const result = await refundRegistration(
        { registration, moment },
        { registrationRepository: registrationRepo, paymentService }
      );

      expect(result.refunded).toBe(false);
      expect(paymentService.refund).not.toHaveBeenCalled();
    });
  });
});

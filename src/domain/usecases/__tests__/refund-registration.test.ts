import { describe, it, expect, vi } from "vitest";
import { refundRegistration } from "../refund-registration";
import { createMockRegistrationRepository, makeRegistration } from "./helpers/mock-registration-repository";
import { makeMoment } from "./helpers/mock-moment-repository";
import { createMockPaymentService } from "./helpers/mock-payment-service";
import { StripeRefundFailedError } from "@/domain/errors";

describe("refundRegistration", () => {
  describe("given a PAID registration on a refundable event", () => {
    it("should call Stripe refund and update paymentStatus to REFUNDED", async () => {
      const registration = makeRegistration({
        paymentStatus: "PAID",
        stripePaymentIntentId: "pi_test_123", stripeAccountId: "acct_test",
      });
      const moment = makeMoment({ price: 1500, refundable: true });
      const registrationRepo = createMockRegistrationRepository();
      const paymentService = createMockPaymentService();

      const result = await refundRegistration(
        { registration, moment },
        { registrationRepository: registrationRepo, paymentService }
      );

      expect(result.refunded).toBe(true);
      expect(paymentService.refund).toHaveBeenCalledWith({ paymentIntentId: "pi_test_123", accountId: "acct_test" });
      expect(registrationRepo.update).toHaveBeenCalledWith(registration.id, {
        paymentStatus: "REFUNDED",
      });
    });
  });

  describe("given a PAID registration on a non-refundable event", () => {
    it("should NOT refund", async () => {
      const registration = makeRegistration({
        paymentStatus: "PAID",
        stripePaymentIntentId: "pi_test_123", stripeAccountId: "acct_test",
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
        stripePaymentIntentId: "pi_test_456", stripeAccountId: "acct_test",
      });
      const moment = makeMoment({ price: 1500, refundable: false });
      const paymentService = createMockPaymentService();
      const registrationRepo = createMockRegistrationRepository();

      const result = await refundRegistration(
        { registration, moment, force: true },
        { registrationRepository: registrationRepo, paymentService }
      );

      expect(result.refunded).toBe(true);
      expect(paymentService.refund).toHaveBeenCalledWith({ paymentIntentId: "pi_test_456", accountId: "acct_test" });
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

  describe("given a refund refused by Stripe", () => {
    it("should throw and leave the registration PAID", async () => {
      const registration = makeRegistration({
        paymentStatus: "PAID",
        stripePaymentIntentId: "pi_test_refused",
        stripeAccountId: "acct_test",
      });
      const moment = makeMoment({ price: 1500, refundable: true });
      const paymentService = createMockPaymentService({
        refund: vi.fn().mockResolvedValue({ status: "failed" }),
      });
      const registrationRepo = createMockRegistrationRepository();

      await expect(
        refundRegistration(
          { registration, moment },
          { registrationRepository: registrationRepo, paymentService }
        )
      ).rejects.toThrow(StripeRefundFailedError);
      expect(registrationRepo.update).not.toHaveBeenCalled();
    });
  });

  describe("given a refund pending at Stripe", () => {
    it("should mark the registration REFUNDED", async () => {
      const registration = makeRegistration({
        paymentStatus: "PAID",
        stripePaymentIntentId: "pi_test_pending",
        stripeAccountId: "acct_test",
      });
      const moment = makeMoment({ price: 1500, refundable: true });
      const paymentService = createMockPaymentService({
        refund: vi.fn().mockResolvedValue({ status: "pending" }),
      });
      const registrationRepo = createMockRegistrationRepository();

      const result = await refundRegistration(
        { registration, moment },
        { registrationRepository: registrationRepo, paymentService }
      );

      expect(result.refunded).toBe(true);
      expect(registrationRepo.update).toHaveBeenCalledWith(registration.id, { paymentStatus: "REFUNDED" });
    });
  });

  describe("given a PAID registration without an Organizer account", () => {
    it("should NOT call Stripe refund nor mark it REFUNDED", async () => {
      const registration = makeRegistration({
        paymentStatus: "PAID",
        stripePaymentIntentId: "pi_test_no_account",
        stripeAccountId: null,
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
      expect(registrationRepo.update).not.toHaveBeenCalled();
    });
  });

  describe("given a registration already REFUNDED", () => {
    it("should NOT refund again", async () => {
      const registration = makeRegistration({
        paymentStatus: "REFUNDED",
        stripePaymentIntentId: "pi_test_789", stripeAccountId: "acct_test",
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

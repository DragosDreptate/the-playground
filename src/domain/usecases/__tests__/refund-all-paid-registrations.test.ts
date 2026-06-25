import { describe, it, expect, vi } from "vitest";
import { refundAllPaidRegistrations } from "@/domain/usecases/refund-all-paid-registrations";
import { makeMoment } from "./helpers/mock-moment-repository";
import {
  createMockRegistrationRepository,
  makeRegistration,
} from "./helpers/mock-registration-repository";
import { createMockPaymentService } from "./helpers/mock-payment-service";

/**
 * Helper partagé par l'annulation, la suppression et le passage payant → gratuit.
 * Couverture déplacée ici depuis cancel-moment (qui ne rembourse plus), pour que la
 * règle de remboursement ait son propre test, indépendant de ses appelants.
 */
describe("refundAllPaidRegistrations", () => {
  function makeDeps(registrations: ReturnType<typeof makeRegistration>[] = []) {
    const registrationRepository = createMockRegistrationRepository({
      findActiveByMomentId: vi.fn().mockResolvedValue(registrations),
    });
    const paymentService = createMockPaymentService();
    return { registrationRepository, paymentService };
  }

  describe("given a free event", () => {
    it("should not attempt any refund nor query registrations", async () => {
      const deps = makeDeps();

      await refundAllPaidRegistrations(makeMoment({ id: "moment-1", price: 0 }), deps);

      expect(deps.registrationRepository.findActiveByMomentId).not.toHaveBeenCalled();
      expect(deps.paymentService.refund).not.toHaveBeenCalled();
    });
  });

  describe("given a paid event with paid registrations", () => {
    it("should refund every PAID registration and mark it REFUNDED", async () => {
      const deps = makeDeps([
        makeRegistration({ id: "reg-1", paymentStatus: "PAID", stripePaymentIntentId: "pi_1" }),
        makeRegistration({ id: "reg-2", paymentStatus: "PAID", stripePaymentIntentId: "pi_2" }),
      ]);

      await refundAllPaidRegistrations(makeMoment({ id: "moment-1", price: 1500 }), deps);

      expect(deps.paymentService.refund).toHaveBeenCalledWith("pi_1");
      expect(deps.paymentService.refund).toHaveBeenCalledWith("pi_2");
      expect(deps.registrationRepository.update).toHaveBeenCalledWith("reg-1", {
        paymentStatus: "REFUNDED",
      });
      expect(deps.registrationRepository.update).toHaveBeenCalledWith("reg-2", {
        paymentStatus: "REFUNDED",
      });
    });

    it("should skip registrations that are not PAID or lack a payment intent", async () => {
      const deps = makeDeps([
        makeRegistration({ id: "reg-1", paymentStatus: "PENDING", stripePaymentIntentId: "pi_1" }),
        makeRegistration({ id: "reg-2", paymentStatus: "PAID", stripePaymentIntentId: null }),
      ]);

      await refundAllPaidRegistrations(makeMoment({ id: "moment-1", price: 1500 }), deps);

      expect(deps.paymentService.refund).not.toHaveBeenCalled();
    });
  });

  describe("given pre-loaded active registrations", () => {
    it("should use them without re-querying the repository", async () => {
      const deps = makeDeps([]); // findActiveByMomentId renverrait [] si on l'appelait
      const preloaded = [
        makeRegistration({ id: "reg-1", paymentStatus: "PAID", stripePaymentIntentId: "pi_1" }),
      ];

      await refundAllPaidRegistrations(
        makeMoment({ id: "moment-1", price: 1500 }),
        deps,
        preloaded
      );

      expect(deps.registrationRepository.findActiveByMomentId).not.toHaveBeenCalled();
      expect(deps.paymentService.refund).toHaveBeenCalledWith("pi_1");
    });
  });

  describe("given no pre-loaded registrations", () => {
    it("should query active registrations from the repository", async () => {
      const deps = makeDeps([
        makeRegistration({ id: "reg-1", paymentStatus: "PAID", stripePaymentIntentId: "pi_1" }),
      ]);

      await refundAllPaidRegistrations(makeMoment({ id: "moment-1", price: 1500 }), deps);

      expect(deps.registrationRepository.findActiveByMomentId).toHaveBeenCalledWith(
        "moment-1"
      );
      expect(deps.paymentService.refund).toHaveBeenCalledWith("pi_1");
    });
  });
});

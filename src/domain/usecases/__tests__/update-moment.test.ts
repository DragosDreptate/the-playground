import { describe, it, expect, vi } from "vitest";
import { updateMoment } from "@/domain/usecases/update-moment";
import {
  MomentNotFoundError,
  UnauthorizedMomentActionError,
  PriceLockedError,
  CannotMakePaidWithRegistrationsError,
} from "@/domain/errors";
import {
  createMockMomentRepository,
  makeMoment,
} from "./helpers/mock-moment-repository";
import {
  createMockCircleRepository,
  makeCircle,
  makeMembership,
} from "./helpers/mock-circle-repository";
import {
  createMockRegistrationRepository,
  makeRegistration,
} from "./helpers/mock-registration-repository";
import { createMockPaymentService } from "./helpers/mock-payment-service";

describe("UpdateMoment", () => {
  const defaultInput = {
    momentId: "moment-1",
    userId: "user-1",
    title: "Updated Title",
  };

  describe("given a HOST user updating an existing Moment", () => {
    it("should update the Moment", async () => {
      const existing = makeMoment({ id: "moment-1", circleId: "circle-1" });
      const updated = makeMoment({ id: "moment-1", title: "Updated Title" });

      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(existing),
        update: vi.fn().mockResolvedValue(updated),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
      });

      const result = await updateMoment(defaultInput, {
        momentRepository: momentRepo,
        circleRepository: circleRepo,
      });

      expect(result.moment.title).toBe("Updated Title");
      expect(momentRepo.update).toHaveBeenCalledWith(
        "moment-1",
        expect.objectContaining({ title: "Updated Title" })
      );
    });

    it("should verify HOST membership on the Moment's Circle", async () => {
      const existing = makeMoment({ id: "moment-1", circleId: "circle-1" });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(existing),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
      });

      await updateMoment(defaultInput, {
        momentRepository: momentRepo,
        circleRepository: circleRepo,
      });

      expect(circleRepo.findMembership).toHaveBeenCalledWith(
        "circle-1",
        "user-1"
      );
    });
  });

  describe("given a HOST updating the Moment to ONLINE type", () => {
    it("should pass locationType ONLINE and null locationAddress to the repository", async () => {
      const existing = makeMoment({ id: "moment-1", circleId: "circle-1" });
      const updated = makeMoment({
        id: "moment-1",
        locationType: "ONLINE",
        locationName: null,
        locationAddress: null,
        videoLink: "https://meet.example.com/room",
      });

      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(existing),
        update: vi.fn().mockResolvedValue(updated),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
      });

      const result = await updateMoment(
        {
          momentId: "moment-1",
          userId: "user-1",
          locationType: "ONLINE",
          locationName: null,
          locationAddress: null,
          videoLink: "https://meet.example.com/room",
        },
        { momentRepository: momentRepo, circleRepository: circleRepo }
      );

      expect(momentRepo.update).toHaveBeenCalledWith(
        "moment-1",
        expect.objectContaining({
          locationType: "ONLINE",
          locationName: null,
          locationAddress: null,
          videoLink: "https://meet.example.com/room",
        })
      );
      expect(result.moment.locationType).toBe("ONLINE");
    });
  });

  describe("given a HOST updating the coverImage of a Moment", () => {
    it("should pass coverImage and coverImageAttribution to the repository", async () => {
      const attribution = { name: "John Photo", url: "https://unsplash.com/@johnphoto" };
      const existing = makeMoment({ id: "moment-1", circleId: "circle-1" });
      const updated = makeMoment({
        id: "moment-1",
        coverImage: "https://blob.example.com/cover.webp",
        coverImageAttribution: attribution,
      });

      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(existing),
        update: vi.fn().mockResolvedValue(updated),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
      });

      const result = await updateMoment(
        {
          momentId: "moment-1",
          userId: "user-1",
          coverImage: "https://blob.example.com/cover.webp",
          coverImageAttribution: attribution,
        },
        { momentRepository: momentRepo, circleRepository: circleRepo }
      );

      expect(momentRepo.update).toHaveBeenCalledWith(
        "moment-1",
        expect.objectContaining({
          coverImage: "https://blob.example.com/cover.webp",
          coverImageAttribution: attribution,
        })
      );
      expect(result.moment.coverImage).toBe("https://blob.example.com/cover.webp");
      expect(result.moment.coverImageAttribution).toEqual(attribution);
    });

    it("should remove the coverImage when null is passed", async () => {
      const existing = makeMoment({
        id: "moment-1",
        circleId: "circle-1",
        coverImage: "https://blob.example.com/old-cover.webp",
      });
      const updated = makeMoment({
        id: "moment-1",
        coverImage: null,
        coverImageAttribution: null,
      });

      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(existing),
        update: vi.fn().mockResolvedValue(updated),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
      });

      const result = await updateMoment(
        {
          momentId: "moment-1",
          userId: "user-1",
          coverImage: null,
          coverImageAttribution: null,
        },
        { momentRepository: momentRepo, circleRepository: circleRepo }
      );

      expect(momentRepo.update).toHaveBeenCalledWith(
        "moment-1",
        expect.objectContaining({ coverImage: null, coverImageAttribution: null })
      );
      expect(result.moment.coverImage).toBeNull();
    });
  });

  describe("given a HOST cancelling a Moment via status update", () => {
    it("should update the Moment status to CANCELLED", async () => {
      const existing = makeMoment({ id: "moment-1", circleId: "circle-1", status: "PUBLISHED" });
      const cancelled = makeMoment({ id: "moment-1", status: "CANCELLED" });

      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(existing),
        update: vi.fn().mockResolvedValue(cancelled),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
      });

      const result = await updateMoment(
        { momentId: "moment-1", userId: "user-1", status: "CANCELLED" },
        { momentRepository: momentRepo, circleRepository: circleRepo }
      );

      expect(momentRepo.update).toHaveBeenCalledWith(
        "moment-1",
        expect.objectContaining({ status: "CANCELLED" })
      );
      expect(result.moment.status).toBe("CANCELLED");
    });
  });

  describe("given a non-existing Moment", () => {
    it("should throw MomentNotFoundError", async () => {
      const momentRepo = createMockMomentRepository();
      const circleRepo = createMockCircleRepository();

      await expect(
        updateMoment(defaultInput, {
          momentRepository: momentRepo,
          circleRepository: circleRepo,
        })
      ).rejects.toThrow(MomentNotFoundError);
    });
  });

  describe("given a user who is not a member of the Circle", () => {
    it("should throw UnauthorizedMomentActionError", async () => {
      const existing = makeMoment({ id: "moment-1", circleId: "circle-1" });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(existing),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      });

      await expect(
        updateMoment(defaultInput, {
          momentRepository: momentRepo,
          circleRepository: circleRepo,
        })
      ).rejects.toThrow(UnauthorizedMomentActionError);
    });
  });

  describe("given a user who is PLAYER (not HOST) of the Circle", () => {
    it("should throw UnauthorizedMomentActionError", async () => {
      const existing = makeMoment({ id: "moment-1", circleId: "circle-1" });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(existing),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi
          .fn()
          .mockResolvedValue(makeMembership({ role: "PLAYER" })),
      });

      await expect(
        updateMoment(defaultInput, {
          momentRepository: momentRepo,
          circleRepository: circleRepo,
        })
      ).rejects.toThrow(UnauthorizedMomentActionError);
    });
  });

  // ── Price locking transitions ──

  describe("given a free event with no registrations → making it paid", () => {
    it("should allow the transition", async () => {
      const existing = makeMoment({ id: "moment-1", circleId: "circle-1", price: 0 });
      const updated = makeMoment({ id: "moment-1", price: 1500 });
      const circle = makeCircle({ id: "circle-1", stripeConnectAccountId: "acct_123" });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(existing),
        update: vi.fn().mockResolvedValue(updated),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
        findById: vi.fn().mockResolvedValue(circle),
      });
      const registrationRepo = createMockRegistrationRepository({
        countActiveByMomentId: vi.fn().mockResolvedValue(0),
      });

      const result = await updateMoment(
        { momentId: "moment-1", userId: "user-1", price: 1500 },
        { momentRepository: momentRepo, circleRepository: circleRepo, registrationRepository: registrationRepo }
      );

      expect(result.moment.price).toBe(1500);
    });
  });

  describe("given a free event with registrations → making it paid", () => {
    it("should throw CannotMakePaidWithRegistrationsError", async () => {
      const existing = makeMoment({ id: "moment-1", circleId: "circle-1", price: 0 });
      const circle = makeCircle({ id: "circle-1", stripeConnectAccountId: "acct_123" });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(existing),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
        findById: vi.fn().mockResolvedValue(circle),
      });
      const registrationRepo = createMockRegistrationRepository({
        countActiveByMomentId: vi.fn().mockResolvedValue(5),
      });

      await expect(
        updateMoment(
          { momentId: "moment-1", userId: "user-1", price: 1500 },
          { momentRepository: momentRepo, circleRepository: circleRepo, registrationRepository: registrationRepo }
        )
      ).rejects.toThrow(CannotMakePaidWithRegistrationsError);
    });
  });

  describe("given a paid event with no registrations → changing price", () => {
    it("should allow the transition", async () => {
      const existing = makeMoment({ id: "moment-1", circleId: "circle-1", price: 1500 });
      const updated = makeMoment({ id: "moment-1", price: 2000 });
      const circle = makeCircle({ id: "circle-1", stripeConnectAccountId: "acct_123" });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(existing),
        update: vi.fn().mockResolvedValue(updated),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
        findById: vi.fn().mockResolvedValue(circle),
      });
      const registrationRepo = createMockRegistrationRepository({
        countActiveByMomentId: vi.fn().mockResolvedValue(0),
      });

      const result = await updateMoment(
        { momentId: "moment-1", userId: "user-1", price: 2000 },
        { momentRepository: momentRepo, circleRepository: circleRepo, registrationRepository: registrationRepo }
      );

      expect(result.moment.price).toBe(2000);
    });
  });

  describe("given a paid event with registrations → changing price", () => {
    it("should throw PriceLockedError", async () => {
      const existing = makeMoment({ id: "moment-1", circleId: "circle-1", price: 1500 });
      const circle = makeCircle({ id: "circle-1", stripeConnectAccountId: "acct_123" });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(existing),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
        findById: vi.fn().mockResolvedValue(circle),
      });
      const registrationRepo = createMockRegistrationRepository({
        countActiveByMomentId: vi.fn().mockResolvedValue(3),
      });

      await expect(
        updateMoment(
          { momentId: "moment-1", userId: "user-1", price: 2000 },
          { momentRepository: momentRepo, circleRepository: circleRepo, registrationRepository: registrationRepo }
        )
      ).rejects.toThrow(PriceLockedError);
    });
  });

  describe("given a paid event with no registrations → making it free", () => {
    it("should allow the transition", async () => {
      const existing = makeMoment({ id: "moment-1", circleId: "circle-1", price: 1500 });
      const updated = makeMoment({ id: "moment-1", price: 0 });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(existing),
        update: vi.fn().mockResolvedValue(updated),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
      });
      const registrationRepo = createMockRegistrationRepository({
        countActiveByMomentId: vi.fn().mockResolvedValue(0),
      });

      const result = await updateMoment(
        { momentId: "moment-1", userId: "user-1", price: 0 },
        { momentRepository: momentRepo, circleRepository: circleRepo, registrationRepository: registrationRepo }
      );

      expect(result.moment.price).toBe(0);
    });
  });

  describe("given a paid event with paid registrations → making it free", () => {
    it("should refund all PAID registrations and allow the transition", async () => {
      const existing = makeMoment({ id: "moment-1", circleId: "circle-1", price: 1500 });
      const updated = makeMoment({ id: "moment-1", price: 0 });
      const paidReg = makeRegistration({ id: "reg-1", paymentStatus: "PAID", stripePaymentIntentId: "pi_1" });
      const freeReg = makeRegistration({ id: "reg-2", paymentStatus: "NONE" });

      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(existing),
        update: vi.fn().mockResolvedValue(updated),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
      });
      const registrationRepo = createMockRegistrationRepository({
        countActiveByMomentId: vi.fn().mockResolvedValue(2),
        findActiveByMomentId: vi.fn().mockResolvedValue([paidReg, freeReg]),
      });
      const paymentService = createMockPaymentService();

      const result = await updateMoment(
        { momentId: "moment-1", userId: "user-1", price: 0 },
        { momentRepository: momentRepo, circleRepository: circleRepo, registrationRepository: registrationRepo, paymentService }
      );

      expect(result.moment.price).toBe(0);
      expect(paymentService.refund).toHaveBeenCalledWith("pi_1");
      expect(paymentService.refund).toHaveBeenCalledTimes(1); // Only the PAID one, not the free one
    });
  });
});

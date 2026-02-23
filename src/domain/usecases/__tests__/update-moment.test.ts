import { describe, it, expect, vi } from "vitest";
import { updateMoment } from "@/domain/usecases/update-moment";
import {
  MomentNotFoundError,
  UnauthorizedMomentActionError,
} from "@/domain/errors";
import {
  createMockMomentRepository,
  makeMoment,
} from "./helpers/mock-moment-repository";
import {
  createMockCircleRepository,
  makeMembership,
} from "./helpers/mock-circle-repository";

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
});

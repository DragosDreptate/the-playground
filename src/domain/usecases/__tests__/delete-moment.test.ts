import { describe, it, expect, vi } from "vitest";
import { deleteMoment } from "@/domain/usecases/delete-moment";
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

describe("DeleteMoment", () => {
  const defaultInput = {
    momentId: "moment-1",
    userId: "user-1",
  };

  describe("given a HOST user deleting an existing Moment", () => {
    it("should delete the Moment", async () => {
      const existing = makeMoment({ id: "moment-1", circleId: "circle-1" });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(existing),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
      });

      await deleteMoment(defaultInput, {
        momentRepository: momentRepo,
        circleRepository: circleRepo,
      });

      expect(momentRepo.delete).toHaveBeenCalledWith("moment-1");
    });

    it("should verify HOST membership on the Moment's Circle", async () => {
      const existing = makeMoment({ id: "moment-1", circleId: "circle-1" });
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(existing),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership()),
      });

      await deleteMoment(defaultInput, {
        momentRepository: momentRepo,
        circleRepository: circleRepo,
      });

      expect(circleRepo.findMembership).toHaveBeenCalledWith(
        "circle-1",
        "user-1"
      );
    });
  });

  describe("given a non-existing Moment", () => {
    it("should throw MomentNotFoundError", async () => {
      const momentRepo = createMockMomentRepository();
      const circleRepo = createMockCircleRepository();

      await expect(
        deleteMoment(defaultInput, {
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
        deleteMoment(defaultInput, {
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
        deleteMoment(defaultInput, {
          momentRepository: momentRepo,
          circleRepository: circleRepo,
        })
      ).rejects.toThrow(UnauthorizedMomentActionError);
    });
  });
});

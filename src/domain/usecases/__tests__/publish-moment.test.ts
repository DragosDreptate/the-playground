import { describe, it, expect, vi } from "vitest";
import { publishMoment } from "@/domain/usecases/publish-moment";
import {
  MomentNotFoundError,
  UnauthorizedMomentActionError,
  MomentAlreadyPublishedError,
} from "@/domain/errors";
import {
  createMockMomentRepository,
  makeMoment,
} from "./helpers/mock-moment-repository";
import {
  createMockCircleRepository,
  makeMembership,
} from "./helpers/mock-circle-repository";

describe("PublishMoment", () => {
  const defaultInput = {
    momentId: "moment-1",
    userId: "user-1",
  };

  describe("given a HOST and a DRAFT Moment", () => {
    it("should transition the Moment from DRAFT to PUBLISHED", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment({ status: "DRAFT" })),
        update: vi.fn().mockResolvedValue(makeMoment({ status: "PUBLISHED" })),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
      });

      const result = await publishMoment(defaultInput, {
        momentRepository: momentRepo,
        circleRepository: circleRepo,
      });

      expect(momentRepo.update).toHaveBeenCalledWith(
        "moment-1",
        expect.objectContaining({ status: "PUBLISHED" })
      );
      expect(result.moment.status).toBe("PUBLISHED");
    });
  });

  describe("given a Moment that does not exist", () => {
    it("should throw MomentNotFoundError", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(null),
      });
      const circleRepo = createMockCircleRepository();

      await expect(
        publishMoment(defaultInput, {
          momentRepository: momentRepo,
          circleRepository: circleRepo,
        })
      ).rejects.toThrow(MomentNotFoundError);
    });
  });

  describe("given a user who is not HOST", () => {
    it("should throw UnauthorizedMomentActionError", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment({ status: "DRAFT" })),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "PLAYER" })),
      });

      await expect(
        publishMoment(defaultInput, {
          momentRepository: momentRepo,
          circleRepository: circleRepo,
        })
      ).rejects.toThrow(UnauthorizedMomentActionError);
    });

    it("should throw UnauthorizedMomentActionError when not a member", async () => {
      const momentRepo = createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment({ status: "DRAFT" })),
      });
      const circleRepo = createMockCircleRepository({
        findMembership: vi.fn().mockResolvedValue(null),
      });

      await expect(
        publishMoment(defaultInput, {
          momentRepository: momentRepo,
          circleRepository: circleRepo,
        })
      ).rejects.toThrow(UnauthorizedMomentActionError);
    });
  });

  describe("given a Moment that is already PUBLISHED", () => {
    it.each(["PUBLISHED", "CANCELLED", "PAST"] as const)(
      "should throw MomentAlreadyPublishedError for %s status",
      async (status) => {
        const momentRepo = createMockMomentRepository({
          findById: vi.fn().mockResolvedValue(makeMoment({ status })),
        });
        const circleRepo = createMockCircleRepository({
          findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
        });

        await expect(
          publishMoment(defaultInput, {
            momentRepository: momentRepo,
            circleRepository: circleRepo,
          })
        ).rejects.toThrow(MomentAlreadyPublishedError);
      }
    );
  });
});

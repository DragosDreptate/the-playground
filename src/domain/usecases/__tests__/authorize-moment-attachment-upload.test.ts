import { describe, it, expect, vi } from "vitest";
import { authorizeMomentAttachmentUpload } from "@/domain/usecases/authorize-moment-attachment-upload";
import { createMockMomentAttachmentRepository } from "./helpers/mock-moment-attachment-repository";
import {
  createMockMomentRepository,
  makeMoment,
} from "./helpers/mock-moment-repository";
import {
  createMockCircleRepository,
  makeMembership,
} from "./helpers/mock-circle-repository";
import {
  AttachmentLimitReachedError,
  AttachmentTypeNotAllowedError,
  MomentNotFoundError,
  UnauthorizedMomentActionError,
} from "@/domain/errors";
import {
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_VIDEO_ATTACHMENT_SIZE_BYTES,
  MAX_ATTACHMENTS_PER_MOMENT,
} from "@/domain/models/moment-attachment";

describe("AuthorizeMomentAttachmentUpload", () => {
  function hostDeps(
    overrides: {
      attachmentRepository?: Partial<
        ReturnType<typeof createMockMomentAttachmentRepository>
      >;
      momentRepository?: Partial<ReturnType<typeof createMockMomentRepository>>;
      circleRepository?: Partial<ReturnType<typeof createMockCircleRepository>>;
    } = {}
  ) {
    return {
      attachmentRepository: createMockMomentAttachmentRepository({
        countByMoment: vi.fn().mockResolvedValue(0),
        ...overrides.attachmentRepository,
      }),
      momentRepository: createMockMomentRepository({
        findById: vi.fn().mockResolvedValue(makeMoment({ id: "moment-1" })),
        ...overrides.momentRepository,
      }),
      circleRepository: createMockCircleRepository({
        findMembership: vi
          .fn()
          .mockResolvedValue(makeMembership({ role: "HOST" })),
        ...overrides.circleRepository,
      }),
    };
  }

  describe("given an authorized HOST and available slot", () => {
    it("should return the document cap (10 MB) for a PDF", async () => {
      const result = await authorizeMomentAttachmentUpload(
        { momentId: "moment-1", userId: "user-1", contentType: "application/pdf" },
        hostDeps()
      );
      expect(result).toEqual({ maxSizeBytes: MAX_ATTACHMENT_SIZE_BYTES });
    });

    it("should return the video cap (30 MB) for an MP4", async () => {
      const result = await authorizeMomentAttachmentUpload(
        { momentId: "moment-1", userId: "user-1", contentType: "video/mp4" },
        hostDeps()
      );
      expect(result).toEqual({ maxSizeBytes: MAX_VIDEO_ATTACHMENT_SIZE_BYTES });
    });
  });

  describe("given an invalid request", () => {
    it("should throw AttachmentTypeNotAllowedError for a disallowed type", async () => {
      await expect(
        authorizeMomentAttachmentUpload(
          { momentId: "moment-1", userId: "user-1", contentType: "image/svg+xml" },
          hostDeps()
        )
      ).rejects.toThrow(AttachmentTypeNotAllowedError);
    });

    it("should throw MomentNotFoundError when the moment is missing", async () => {
      await expect(
        authorizeMomentAttachmentUpload(
          { momentId: "missing", userId: "user-1", contentType: "video/mp4" },
          hostDeps({
            momentRepository: { findById: vi.fn().mockResolvedValue(null) },
          })
        )
      ).rejects.toThrow(MomentNotFoundError);
    });

    it("should throw UnauthorizedMomentActionError when the user is not a HOST", async () => {
      await expect(
        authorizeMomentAttachmentUpload(
          { momentId: "moment-1", userId: "player-1", contentType: "video/mp4" },
          hostDeps({
            circleRepository: {
              findMembership: vi
                .fn()
                .mockResolvedValue(makeMembership({ role: "PLAYER" })),
            },
          })
        )
      ).rejects.toThrow(UnauthorizedMomentActionError);
    });

    it("should throw AttachmentLimitReachedError when the moment already has 3 files", async () => {
      await expect(
        authorizeMomentAttachmentUpload(
          { momentId: "moment-1", userId: "user-1", contentType: "video/mp4" },
          hostDeps({
            attachmentRepository: {
              countByMoment: vi
                .fn()
                .mockResolvedValue(MAX_ATTACHMENTS_PER_MOMENT),
            },
          })
        )
      ).rejects.toThrow(AttachmentLimitReachedError);
    });
  });
});

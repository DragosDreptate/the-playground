import { describe, it, expect, vi } from "vitest";
import { addMomentAttachment } from "@/domain/usecases/add-moment-attachment";
import {
  createMockMomentAttachmentRepository,
  makeAttachment,
} from "./helpers/mock-moment-attachment-repository";
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
  AttachmentTooLargeError,
  AttachmentTypeNotAllowedError,
  MomentNotFoundError,
  UnauthorizedMomentActionError,
} from "@/domain/errors";
import {
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_VIDEO_ATTACHMENT_SIZE_BYTES,
  MAX_ATTACHMENTS_PER_MOMENT,
} from "@/domain/models/moment-attachment";

// The file is already on Blob storage by the time the usecase runs (client-direct
// upload), so the input carries the blob metadata, not a buffer.
describe("AddMomentAttachment", () => {
  function makeMeta(
    overrides: Partial<{
      url: string;
      filename: string;
      contentType: string;
      sizeBytes: number;
    }> = {}
  ) {
    return {
      url:
        overrides.url ??
        "https://blob.example/moment-attachments/moment-1/menu.pdf",
      filename: overrides.filename ?? "menu.pdf",
      contentType: overrides.contentType ?? "application/pdf",
      sizeBytes: overrides.sizeBytes ?? 1024,
    };
  }

  function makeDeps(
    overrides: {
      attachmentRepository?: Partial<
        ReturnType<typeof createMockMomentAttachmentRepository>
      >;
      momentRepository?: Partial<ReturnType<typeof createMockMomentRepository>>;
      circleRepository?: Partial<ReturnType<typeof createMockCircleRepository>>;
    } = {}
  ) {
    return {
      attachmentRepository: createMockMomentAttachmentRepository(
        overrides.attachmentRepository
      ),
      momentRepository: createMockMomentRepository(overrides.momentRepository),
      circleRepository: createMockCircleRepository(overrides.circleRepository),
    };
  }

  function authorizedHostDeps(
    overrides: Parameters<typeof makeDeps>[0] = {}
  ) {
    return makeDeps({
      momentRepository: {
        findById: vi.fn().mockResolvedValue(makeMoment({ id: "moment-1" })),
        ...overrides.momentRepository,
      },
      circleRepository: {
        findMembership: vi
          .fn()
          .mockResolvedValue(makeMembership({ role: "HOST" })),
        ...overrides.circleRepository,
      },
      attachmentRepository: {
        countByMoment: vi.fn().mockResolvedValue(0),
        ...overrides.attachmentRepository,
      },
    });
  }

  describe("given valid metadata and an authorized HOST user", () => {
    it("should persist the attachment with the blob metadata", async () => {
      const expectedAttachment = makeAttachment({ filename: "menu.pdf" });
      const deps = authorizedHostDeps({
        attachmentRepository: {
          countByMoment: vi.fn().mockResolvedValue(0),
          create: vi.fn().mockResolvedValue(expectedAttachment),
        },
      });

      const result = await addMomentAttachment(
        { momentId: "moment-1", userId: "user-1", ...makeMeta() },
        deps
      );

      expect(result).toEqual(expectedAttachment);
      expect(deps.attachmentRepository.create).toHaveBeenCalledWith({
        momentId: "moment-1",
        url: "https://blob.example/moment-attachments/moment-1/menu.pdf",
        filename: "menu.pdf",
        contentType: "application/pdf",
        sizeBytes: 1024,
      });
    });

    it("should persist the original filename verbatim (non-ASCII preserved)", async () => {
      const deps = authorizedHostDeps();

      await addMomentAttachment(
        {
          momentId: "moment-1",
          userId: "user-1",
          ...makeMeta({ filename: "Événement Été 2026.pdf" }),
        },
        deps
      );

      expect(deps.attachmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ filename: "Événement Été 2026.pdf" })
      );
    });
  });

  describe("given the moment does not exist", () => {
    it("should throw MomentNotFoundError", async () => {
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(null) },
      });

      await expect(
        addMomentAttachment(
          { momentId: "missing", userId: "user-1", ...makeMeta() },
          deps
        )
      ).rejects.toThrow(MomentNotFoundError);

      expect(deps.attachmentRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("given the user is not a HOST of the Circle", () => {
    it("should throw UnauthorizedMomentActionError when user has no membership", async () => {
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(makeMoment()) },
        circleRepository: { findMembership: vi.fn().mockResolvedValue(null) },
      });

      await expect(
        addMomentAttachment(
          { momentId: "moment-1", userId: "intruder", ...makeMeta() },
          deps
        )
      ).rejects.toThrow(UnauthorizedMomentActionError);

      expect(deps.attachmentRepository.create).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedMomentActionError when user is a PLAYER (not HOST)", async () => {
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(makeMoment()) },
        circleRepository: {
          findMembership: vi
            .fn()
            .mockResolvedValue(makeMembership({ role: "PLAYER" })),
        },
      });

      await expect(
        addMomentAttachment(
          { momentId: "moment-1", userId: "player-1", ...makeMeta() },
          deps
        )
      ).rejects.toThrow(UnauthorizedMomentActionError);

      expect(deps.attachmentRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("given a disallowed content type", () => {
    const disallowedTypes = [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/zip",
      "image/gif",
      "image/svg+xml",
      "video/x-msvideo",
    ];

    it.each(disallowedTypes)(
      "should throw AttachmentTypeNotAllowedError for %s",
      async (contentType) => {
        const deps = authorizedHostDeps();

        await expect(
          addMomentAttachment(
            {
              momentId: "moment-1",
              userId: "user-1",
              ...makeMeta({ contentType }),
            },
            deps
          )
        ).rejects.toThrow(AttachmentTypeNotAllowedError);

        expect(deps.attachmentRepository.create).not.toHaveBeenCalled();
      }
    );
  });

  describe("given allowed content types", () => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/quicktime",
      "video/webm",
    ];

    it.each(allowedTypes)("should accept %s", async (contentType) => {
      const deps = authorizedHostDeps();

      await expect(
        addMomentAttachment(
          {
            momentId: "moment-1",
            userId: "user-1",
            ...makeMeta({ contentType }),
          },
          deps
        )
      ).resolves.toBeDefined();
    });
  });

  describe("given size limits differ per content type", () => {
    it("should reject an image above 10 MB", async () => {
      const deps = authorizedHostDeps();

      await expect(
        addMomentAttachment(
          {
            momentId: "moment-1",
            userId: "user-1",
            ...makeMeta({
              contentType: "image/png",
              sizeBytes: MAX_ATTACHMENT_SIZE_BYTES + 1,
            }),
          },
          deps
        )
      ).rejects.toThrow(AttachmentTooLargeError);
    });

    it("should accept a video up to 30 MB", async () => {
      const deps = authorizedHostDeps();

      await expect(
        addMomentAttachment(
          {
            momentId: "moment-1",
            userId: "user-1",
            ...makeMeta({
              contentType: "video/mp4",
              sizeBytes: MAX_VIDEO_ATTACHMENT_SIZE_BYTES,
            }),
          },
          deps
        )
      ).resolves.toBeDefined();
    });

    it("should reject a video above 30 MB", async () => {
      const deps = authorizedHostDeps();

      await expect(
        addMomentAttachment(
          {
            momentId: "moment-1",
            userId: "user-1",
            ...makeMeta({
              contentType: "video/mp4",
              sizeBytes: MAX_VIDEO_ATTACHMENT_SIZE_BYTES + 1,
            }),
          },
          deps
        )
      ).rejects.toThrow(AttachmentTooLargeError);
    });

    it("should accept a 15 MB video but reject a 15 MB image", async () => {
      const fifteenMb = 15 * 1024 * 1024;

      await expect(
        addMomentAttachment(
          {
            momentId: "moment-1",
            userId: "user-1",
            ...makeMeta({ contentType: "video/mp4", sizeBytes: fifteenMb }),
          },
          authorizedHostDeps()
        )
      ).resolves.toBeDefined();

      await expect(
        addMomentAttachment(
          {
            momentId: "moment-1",
            userId: "user-1",
            ...makeMeta({ contentType: "image/jpeg", sizeBytes: fifteenMb }),
          },
          authorizedHostDeps()
        )
      ).rejects.toThrow(AttachmentTooLargeError);
    });
  });

  describe("given the attachment limit is already reached", () => {
    it("should throw AttachmentLimitReachedError when count equals the limit", async () => {
      const deps = authorizedHostDeps({
        attachmentRepository: {
          countByMoment: vi.fn().mockResolvedValue(MAX_ATTACHMENTS_PER_MOMENT),
        },
      });

      await expect(
        addMomentAttachment(
          { momentId: "moment-1", userId: "user-1", ...makeMeta() },
          deps
        )
      ).rejects.toThrow(AttachmentLimitReachedError);

      expect(deps.attachmentRepository.create).not.toHaveBeenCalled();
    });

    it("should accept when count is one less than the limit", async () => {
      const deps = authorizedHostDeps({
        attachmentRepository: {
          countByMoment: vi
            .fn()
            .mockResolvedValue(MAX_ATTACHMENTS_PER_MOMENT - 1),
        },
      });

      await expect(
        addMomentAttachment(
          { momentId: "moment-1", userId: "user-1", ...makeMeta() },
          deps
        )
      ).resolves.toBeDefined();
    });
  });
});

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
import { createMockStorageService } from "./helpers/mock-storage-service";
import {
  AttachmentLimitReachedError,
  AttachmentTooLargeError,
  AttachmentTypeNotAllowedError,
  MomentNotFoundError,
  UnauthorizedMomentActionError,
} from "@/domain/errors";
import {
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_ATTACHMENTS_PER_MOMENT,
} from "@/domain/models/moment-attachment";

describe("AddMomentAttachment", () => {
  function makeValidFile(overrides: Partial<{ filename: string; contentType: string; sizeBytes: number }> = {}) {
    return {
      buffer: Buffer.from("test content"),
      filename: overrides.filename ?? "menu.pdf",
      contentType: overrides.contentType ?? "application/pdf",
      sizeBytes: overrides.sizeBytes ?? 1024,
    };
  }

  function makeDeps(overrides: {
    attachmentRepository?: Partial<ReturnType<typeof createMockMomentAttachmentRepository>>;
    momentRepository?: Partial<ReturnType<typeof createMockMomentRepository>>;
    circleRepository?: Partial<ReturnType<typeof createMockCircleRepository>>;
    storage?: Partial<ReturnType<typeof createMockStorageService>>;
  } = {}) {
    return {
      attachmentRepository: createMockMomentAttachmentRepository(overrides.attachmentRepository),
      momentRepository: createMockMomentRepository(overrides.momentRepository),
      circleRepository: createMockCircleRepository(overrides.circleRepository),
      storage: createMockStorageService(overrides.storage),
    };
  }

  describe("given a valid file and an authorized HOST user", () => {
    it("should upload the blob and persist the attachment", async () => {
      const moment = makeMoment({ id: "moment-1", circleId: "circle-1" });
      const expectedAttachment = makeAttachment({ filename: "menu.pdf" });
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        circleRepository: {
          findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
        },
        attachmentRepository: {
          countByMoment: vi.fn().mockResolvedValue(0),
          create: vi.fn().mockResolvedValue(expectedAttachment),
        },
      });

      const result = await addMomentAttachment(
        {
          momentId: "moment-1",
          userId: "user-1",
          file: makeValidFile({ filename: "menu.pdf" }),
        },
        deps
      );

      expect(result).toEqual(expectedAttachment);
      expect(deps.storage.upload).toHaveBeenCalledTimes(1);
      expect(deps.attachmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          momentId: "moment-1",
          filename: "menu.pdf",
          contentType: "application/pdf",
          sizeBytes: 1024,
        })
      );
    });

    it("should include the momentId and a timestamp in the storage path", async () => {
      const moment = makeMoment({ id: "moment-abc" });
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        circleRepository: {
          findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
        },
      });

      await addMomentAttachment(
        { momentId: "moment-abc", userId: "user-1", file: makeValidFile() },
        deps
      );

      const uploadCall = (deps.storage.upload as ReturnType<typeof vi.fn>).mock.calls[0];
      const path = uploadCall[0] as string;
      expect(path).toMatch(/^moment-attachments\/moment-abc-\d+-menu\.pdf$/);
    });

    it("should preserve the original filename even if it contains non-ASCII chars (store sanitized in path only)", async () => {
      const moment = makeMoment();
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        circleRepository: {
          findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
        },
      });

      await addMomentAttachment(
        {
          momentId: "moment-1",
          userId: "user-1",
          file: makeValidFile({ filename: "Événement — Été 2026.pdf" }),
        },
        deps
      );

      // The DB record keeps the original filename
      expect(deps.attachmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ filename: "Événement — Été 2026.pdf" })
      );
      // But the storage path has a sanitized version
      const path = (deps.storage.upload as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(path).not.toMatch(/É|é|—/);
    });
  });

  describe("given the moment does not exist", () => {
    it("should throw MomentNotFoundError", async () => {
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(null) },
      });

      await expect(
        addMomentAttachment(
          { momentId: "missing", userId: "user-1", file: makeValidFile() },
          deps
        )
      ).rejects.toThrow(MomentNotFoundError);

      expect(deps.storage.upload).not.toHaveBeenCalled();
    });
  });

  describe("given the user is not a HOST of the Circle", () => {
    it("should throw UnauthorizedMomentActionError when user has no membership", async () => {
      const moment = makeMoment();
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        circleRepository: { findMembership: vi.fn().mockResolvedValue(null) },
      });

      await expect(
        addMomentAttachment(
          { momentId: "moment-1", userId: "intruder", file: makeValidFile() },
          deps
        )
      ).rejects.toThrow(UnauthorizedMomentActionError);

      expect(deps.storage.upload).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedMomentActionError when user is a PLAYER (not HOST)", async () => {
      const moment = makeMoment();
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        circleRepository: {
          findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "PLAYER" })),
        },
      });

      await expect(
        addMomentAttachment(
          { momentId: "moment-1", userId: "player-1", file: makeValidFile() },
          deps
        )
      ).rejects.toThrow(UnauthorizedMomentActionError);

      expect(deps.storage.upload).not.toHaveBeenCalled();
    });
  });

  describe("given a disallowed content type", () => {
    const disallowedTypes = [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/zip",
      "image/gif",
      "video/mp4",
    ];

    it.each(disallowedTypes)(
      "should throw AttachmentTypeNotAllowedError for %s",
      async (contentType) => {
        const moment = makeMoment();
        const deps = makeDeps({
          momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
          circleRepository: {
            findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
          },
        });

        await expect(
          addMomentAttachment(
            {
              momentId: "moment-1",
              userId: "user-1",
              file: makeValidFile({ contentType }),
            },
            deps
          )
        ).rejects.toThrow(AttachmentTypeNotAllowedError);

        expect(deps.storage.upload).not.toHaveBeenCalled();
      }
    );
  });

  describe("given allowed content types", () => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    it.each(allowedTypes)(
      "should accept %s",
      async (contentType) => {
        const moment = makeMoment();
        const deps = makeDeps({
          momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
          circleRepository: {
            findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
          },
        });

        await expect(
          addMomentAttachment(
            {
              momentId: "moment-1",
              userId: "user-1",
              file: makeValidFile({ contentType }),
            },
            deps
          )
        ).resolves.toBeDefined();
      }
    );
  });

  describe("given a file too large", () => {
    it("should throw AttachmentTooLargeError when file exceeds the limit", async () => {
      const moment = makeMoment();
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        circleRepository: {
          findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
        },
      });

      await expect(
        addMomentAttachment(
          {
            momentId: "moment-1",
            userId: "user-1",
            file: makeValidFile({ sizeBytes: MAX_ATTACHMENT_SIZE_BYTES + 1 }),
          },
          deps
        )
      ).rejects.toThrow(AttachmentTooLargeError);

      expect(deps.storage.upload).not.toHaveBeenCalled();
    });

    it("should accept a file exactly at the limit", async () => {
      const moment = makeMoment();
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        circleRepository: {
          findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
        },
      });

      await expect(
        addMomentAttachment(
          {
            momentId: "moment-1",
            userId: "user-1",
            file: makeValidFile({ sizeBytes: MAX_ATTACHMENT_SIZE_BYTES }),
          },
          deps
        )
      ).resolves.toBeDefined();
    });
  });

  describe("given the attachment limit is already reached", () => {
    it("should throw AttachmentLimitReachedError when count equals the limit", async () => {
      const moment = makeMoment();
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        circleRepository: {
          findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
        },
        attachmentRepository: {
          countByMoment: vi.fn().mockResolvedValue(MAX_ATTACHMENTS_PER_MOMENT),
        },
      });

      await expect(
        addMomentAttachment(
          { momentId: "moment-1", userId: "user-1", file: makeValidFile() },
          deps
        )
      ).rejects.toThrow(AttachmentLimitReachedError);

      expect(deps.storage.upload).not.toHaveBeenCalled();
    });

    it("should accept when count is one less than the limit", async () => {
      const moment = makeMoment();
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        circleRepository: {
          findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
        },
        attachmentRepository: {
          countByMoment: vi.fn().mockResolvedValue(MAX_ATTACHMENTS_PER_MOMENT - 1),
        },
      });

      await expect(
        addMomentAttachment(
          { momentId: "moment-1", userId: "user-1", file: makeValidFile() },
          deps
        )
      ).resolves.toBeDefined();
    });
  });
});

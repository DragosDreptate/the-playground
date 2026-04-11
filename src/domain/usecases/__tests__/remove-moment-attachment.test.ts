import { describe, it, expect, vi } from "vitest";
import { removeMomentAttachment } from "@/domain/usecases/remove-moment-attachment";
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
  AttachmentNotFoundError,
  MomentNotFoundError,
  UnauthorizedMomentActionError,
} from "@/domain/errors";

describe("RemoveMomentAttachment", () => {
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

  describe("given the attachment exists and the user is HOST", () => {
    it("should delete the blob first, then the DB row", async () => {
      const attachment = makeAttachment({ id: "att-1", momentId: "moment-1" });
      const moment = makeMoment({ id: "moment-1", circleId: "circle-1" });
      const callOrder: string[] = [];

      const deps = makeDeps({
        attachmentRepository: {
          findById: vi.fn().mockResolvedValue(attachment),
          delete: vi.fn().mockImplementation(async () => {
            callOrder.push("db-delete");
          }),
        },
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        circleRepository: {
          findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
        },
        storage: {
          delete: vi.fn().mockImplementation(async () => {
            callOrder.push("blob-delete");
          }),
        },
      });

      await removeMomentAttachment(
        { attachmentId: "att-1", userId: "user-1" },
        deps
      );

      expect(callOrder).toEqual(["blob-delete", "db-delete"]);
      expect(deps.storage.delete).toHaveBeenCalledWith(attachment.url);
      expect(deps.attachmentRepository.delete).toHaveBeenCalledWith("att-1");
    });
  });

  describe("given the storage deletion fails", () => {
    it("should NOT delete the DB row (consistency)", async () => {
      const attachment = makeAttachment();
      const moment = makeMoment();
      const deps = makeDeps({
        attachmentRepository: {
          findById: vi.fn().mockResolvedValue(attachment),
        },
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        circleRepository: {
          findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "HOST" })),
        },
        storage: {
          delete: vi.fn().mockRejectedValue(new Error("Blob service down")),
        },
      });

      await expect(
        removeMomentAttachment(
          { attachmentId: "att-1", userId: "user-1" },
          deps
        )
      ).rejects.toThrow("Blob service down");

      expect(deps.attachmentRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe("given the attachment does not exist", () => {
    it("should throw AttachmentNotFoundError", async () => {
      const deps = makeDeps({
        attachmentRepository: { findById: vi.fn().mockResolvedValue(null) },
      });

      await expect(
        removeMomentAttachment(
          { attachmentId: "missing", userId: "user-1" },
          deps
        )
      ).rejects.toThrow(AttachmentNotFoundError);

      expect(deps.storage.delete).not.toHaveBeenCalled();
      expect(deps.attachmentRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe("given the parent moment is orphaned (defensive case)", () => {
    it("should throw MomentNotFoundError", async () => {
      const attachment = makeAttachment({ momentId: "orphan-moment" });
      const deps = makeDeps({
        attachmentRepository: { findById: vi.fn().mockResolvedValue(attachment) },
        momentRepository: { findById: vi.fn().mockResolvedValue(null) },
      });

      await expect(
        removeMomentAttachment(
          { attachmentId: "att-1", userId: "user-1" },
          deps
        )
      ).rejects.toThrow(MomentNotFoundError);
    });
  });

  describe("given the user is not a HOST of the Circle", () => {
    it("should throw UnauthorizedMomentActionError when user has no membership", async () => {
      const attachment = makeAttachment();
      const moment = makeMoment();
      const deps = makeDeps({
        attachmentRepository: { findById: vi.fn().mockResolvedValue(attachment) },
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        circleRepository: { findMembership: vi.fn().mockResolvedValue(null) },
      });

      await expect(
        removeMomentAttachment(
          { attachmentId: "att-1", userId: "intruder" },
          deps
        )
      ).rejects.toThrow(UnauthorizedMomentActionError);

      expect(deps.storage.delete).not.toHaveBeenCalled();
      expect(deps.attachmentRepository.delete).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedMomentActionError when user is a PLAYER", async () => {
      const attachment = makeAttachment();
      const moment = makeMoment();
      const deps = makeDeps({
        attachmentRepository: { findById: vi.fn().mockResolvedValue(attachment) },
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
        circleRepository: {
          findMembership: vi.fn().mockResolvedValue(makeMembership({ role: "PLAYER" })),
        },
      });

      await expect(
        removeMomentAttachment(
          { attachmentId: "att-1", userId: "player-1" },
          deps
        )
      ).rejects.toThrow(UnauthorizedMomentActionError);

      expect(deps.storage.delete).not.toHaveBeenCalled();
      expect(deps.attachmentRepository.delete).not.toHaveBeenCalled();
    });
  });
});

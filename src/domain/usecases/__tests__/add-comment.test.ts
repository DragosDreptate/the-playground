import { describe, it, expect, vi } from "vitest";
import { addComment } from "@/domain/usecases/add-comment";
import type { CommentPhotoInput } from "@/domain/usecases/add-comment";
import { createMockCommentRepository, makeComment } from "./helpers/mock-comment-repository";
import { createMockMomentRepository, makeMoment } from "./helpers/mock-moment-repository";
import { createMockCommentAttachmentRepository } from "./helpers/mock-comment-attachment-repository";
import { createMockStorageService } from "./helpers/mock-storage-service";
import {
  CommentContentEmptyError,
  CommentContentTooLongError,
  CommentPhotoLimitReachedError,
  CommentPhotoTooLargeError,
  CommentPhotoTypeNotAllowedError,
  MomentNotFoundError,
} from "@/domain/errors";
import {
  MAX_COMMENT_PHOTO_SIZE_BYTES,
} from "@/domain/models/comment-attachment";

function makePhoto(overrides: Partial<CommentPhotoInput> = {}): CommentPhotoInput {
  return {
    buffer: Buffer.from("fake-image-content"),
    filename: "photo.jpg",
    contentType: "image/jpeg",
    sizeBytes: 100_000,
    ...overrides,
  };
}

describe("AddComment", () => {
  function makeDeps(overrides: {
    commentRepository?: Partial<ReturnType<typeof createMockCommentRepository>>;
    momentRepository?: Partial<ReturnType<typeof createMockMomentRepository>>;
    commentAttachmentRepository?: Partial<ReturnType<typeof createMockCommentAttachmentRepository>>;
    storage?: Partial<ReturnType<typeof createMockStorageService>>;
  } = {}) {
    return {
      commentRepository: createMockCommentRepository(overrides.commentRepository),
      momentRepository: createMockMomentRepository(overrides.momentRepository),
      commentAttachmentRepository: createMockCommentAttachmentRepository(overrides.commentAttachmentRepository),
      storage: createMockStorageService(overrides.storage),
    };
  }

  function depsWithMoment(overrides: Parameters<typeof makeDeps>[0] = {}) {
    return makeDeps({
      momentRepository: { findById: vi.fn().mockResolvedValue(makeMoment()) },
      ...overrides,
    });
  }

  // --- Text-only comments (existing behavior) ---

  describe("given a valid Moment and non-empty content", () => {
    it("should create and return the comment", async () => {
      const moment = makeMoment();
      const comment = makeComment({ content: "Hello world" });
      const deps = makeDeps({
        momentRepository: {
          findById: vi.fn().mockResolvedValue(moment),
        },
        commentRepository: {
          create: vi.fn().mockResolvedValue(comment),
        },
      });

      const result = await addComment(
        { momentId: "moment-1", userId: "user-1", content: "Hello world" },
        deps
      );

      expect(result.comment).toEqual(comment);
      expect(result.photoCount).toBe(0);
      expect(deps.commentRepository.create).toHaveBeenCalledWith({
        momentId: "moment-1",
        userId: "user-1",
        content: "Hello world",
      });
    });

    it("should trim the content before saving", async () => {
      const moment = makeMoment();
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
      });

      await addComment(
        { momentId: "moment-1", userId: "user-1", content: "  Hello world  " },
        deps
      );

      expect(deps.commentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ content: "Hello world" })
      );
    });
  });

  describe("given empty content", () => {
    it("should throw CommentContentEmptyError for blank string", async () => {
      const deps = makeDeps();
      await expect(
        addComment(
          { momentId: "moment-1", userId: "user-1", content: "" },
          deps
        )
      ).rejects.toThrow(CommentContentEmptyError);
    });

    it("should throw CommentContentEmptyError for whitespace-only string", async () => {
      const deps = makeDeps();
      await expect(
        addComment(
          { momentId: "moment-1", userId: "user-1", content: "   " },
          deps
        )
      ).rejects.toThrow(CommentContentEmptyError);
    });
  });

  describe("given content that exceeds the maximum length", () => {
    it("should throw CommentContentTooLongError for 2001 characters", async () => {
      const deps = makeDeps();
      const longContent = "a".repeat(2001);
      await expect(
        addComment(
          { momentId: "moment-1", userId: "user-1", content: longContent },
          deps
        )
      ).rejects.toThrow(CommentContentTooLongError);
    });

    it("should accept exactly 2000 characters", async () => {
      const moment = makeMoment();
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(moment) },
      });
      const maxContent = "a".repeat(2000);
      await expect(
        addComment(
          { momentId: "moment-1", userId: "user-1", content: maxContent },
          deps
        )
      ).resolves.toBeDefined();
    });
  });

  describe("given a non-existent Moment", () => {
    it("should throw MomentNotFoundError", async () => {
      const deps = makeDeps({
        momentRepository: { findById: vi.fn().mockResolvedValue(null) },
      });
      await expect(
        addComment(
          { momentId: "moment-999", userId: "user-1", content: "Hello" },
          deps
        )
      ).rejects.toThrow(MomentNotFoundError);
    });
  });

  // --- Comments with photos ---

  describe("given valid content and valid photos", () => {
    it("should create comment and upload photos", async () => {
      const comment = makeComment();
      const deps = depsWithMoment({
        commentRepository: { create: vi.fn().mockResolvedValue(comment) },
      });

      const result = await addComment(
        {
          momentId: "moment-1",
          userId: "user-1",
          content: "Great event!",
          photos: [makePhoto(), makePhoto({ filename: "photo2.png", contentType: "image/png" })],
        },
        deps
      );

      expect(result.comment).toEqual(comment);
      expect(result.photoCount).toBe(2);
      expect(deps.storage.upload).toHaveBeenCalledTimes(2);
      expect(deps.commentAttachmentRepository.create).toHaveBeenCalledTimes(2);
    });

    it("should upload photos in parallel", async () => {
      const callOrder: string[] = [];
      const deps = depsWithMoment({
        storage: {
          upload: vi.fn().mockImplementation(async () => {
            callOrder.push("upload-start");
            await new Promise((r) => setTimeout(r, 10));
            callOrder.push("upload-end");
            return "https://blob.test/photo.jpg";
          }),
        },
      });

      await addComment(
        {
          momentId: "moment-1",
          userId: "user-1",
          content: "Parallel test",
          photos: [makePhoto(), makePhoto()],
        },
        deps
      );

      // Both uploads should start before either finishes
      expect(callOrder[0]).toBe("upload-start");
      expect(callOrder[1]).toBe("upload-start");
    });
  });

  describe("given valid content and 0 photos", () => {
    it("should create comment only (retro-compatible)", async () => {
      const deps = depsWithMoment();

      const result = await addComment(
        { momentId: "moment-1", userId: "user-1", content: "No photos" },
        deps
      );

      expect(result.photoCount).toBe(0);
      expect(deps.storage.upload).not.toHaveBeenCalled();
      expect(deps.commentAttachmentRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("given too many photos", () => {
    it("should throw CommentPhotoLimitReachedError for 4 photos", async () => {
      const deps = depsWithMoment();

      await expect(
        addComment(
          {
            momentId: "moment-1",
            userId: "user-1",
            content: "Too many photos",
            photos: [makePhoto(), makePhoto(), makePhoto(), makePhoto()],
          },
          deps
        )
      ).rejects.toThrow(CommentPhotoLimitReachedError);

      // No side-effect: comment should NOT be created
      expect(deps.commentRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("given photos with invalid types", () => {
    it.each([
      ["image/gif", "GIF"],
      ["application/pdf", "PDF"],
      ["image/svg+xml", "SVG"],
      ["text/plain", "text"],
    ])("should throw CommentPhotoTypeNotAllowedError for %s (%s)", async (contentType) => {
      const deps = depsWithMoment();

      await expect(
        addComment(
          {
            momentId: "moment-1",
            userId: "user-1",
            content: "Bad type",
            photos: [makePhoto({ contentType })],
          },
          deps
        )
      ).rejects.toThrow(CommentPhotoTypeNotAllowedError);

      expect(deps.commentRepository.create).not.toHaveBeenCalled();
    });

    it.each([
      ["image/jpeg", "JPEG"],
      ["image/png", "PNG"],
      ["image/webp", "WebP"],
    ])("should accept %s (%s)", async (contentType) => {
      const deps = depsWithMoment();

      await expect(
        addComment(
          {
            momentId: "moment-1",
            userId: "user-1",
            content: "Good type",
            photos: [makePhoto({ contentType })],
          },
          deps
        )
      ).resolves.toBeDefined();
    });
  });

  describe("given photos that exceed size limit", () => {
    it("should throw CommentPhotoTooLargeError for photo > 5 MB", async () => {
      const deps = depsWithMoment();

      await expect(
        addComment(
          {
            momentId: "moment-1",
            userId: "user-1",
            content: "Too large",
            photos: [makePhoto({ sizeBytes: MAX_COMMENT_PHOTO_SIZE_BYTES + 1 })],
          },
          deps
        )
      ).rejects.toThrow(CommentPhotoTooLargeError);

      expect(deps.commentRepository.create).not.toHaveBeenCalled();
    });

    it("should accept photo at exactly 5 MB", async () => {
      const deps = depsWithMoment();

      await expect(
        addComment(
          {
            momentId: "moment-1",
            userId: "user-1",
            content: "Exact limit",
            photos: [makePhoto({ sizeBytes: MAX_COMMENT_PHOTO_SIZE_BYTES })],
          },
          deps
        )
      ).resolves.toBeDefined();
    });
  });

  describe("given valid photos but empty content", () => {
    it("should throw CommentContentEmptyError (text is mandatory)", async () => {
      const deps = depsWithMoment();

      await expect(
        addComment(
          {
            momentId: "moment-1",
            userId: "user-1",
            content: "",
            photos: [makePhoto()],
          },
          deps
        )
      ).rejects.toThrow(CommentContentEmptyError);
    });
  });

  describe("given photo validation fails", () => {
    it("should not create the comment (no side-effect before validation)", async () => {
      const deps = depsWithMoment();

      await expect(
        addComment(
          {
            momentId: "moment-1",
            userId: "user-1",
            content: "Valid text",
            photos: [makePhoto({ contentType: "image/gif" })],
          },
          deps
        )
      ).rejects.toThrow(CommentPhotoTypeNotAllowedError);

      expect(deps.commentRepository.create).not.toHaveBeenCalled();
      expect(deps.storage.upload).not.toHaveBeenCalled();
    });
  });

  describe("given user with PENDING_APPROVAL registration and photos", () => {
    it("should throw MomentNotFoundError (same block as text-only)", async () => {
      const mockRegistrationRepo = {
        findByMomentAndUser: vi.fn().mockResolvedValue({ status: "PENDING_APPROVAL" }),
      };
      const deps = {
        ...depsWithMoment(),
        registrationRepository: mockRegistrationRepo as never,
      };

      await expect(
        addComment(
          {
            momentId: "moment-1",
            userId: "user-1",
            content: "With photos",
            photos: [makePhoto()],
          },
          deps
        )
      ).rejects.toThrow(MomentNotFoundError);
    });
  });
});

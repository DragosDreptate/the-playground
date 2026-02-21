import { describe, it, expect, vi } from "vitest";
import { addComment } from "@/domain/usecases/add-comment";
import { createMockCommentRepository, makeComment } from "./helpers/mock-comment-repository";
import { createMockMomentRepository, makeMoment } from "./helpers/mock-moment-repository";
import {
  CommentContentEmptyError,
  CommentContentTooLongError,
  MomentNotFoundError,
} from "@/domain/errors";

describe("AddComment", () => {
  function makeDeps(overrides: {
    commentRepository?: Partial<ReturnType<typeof createMockCommentRepository>>;
    momentRepository?: Partial<ReturnType<typeof createMockMomentRepository>>;
  } = {}) {
    return {
      commentRepository: createMockCommentRepository(overrides.commentRepository),
      momentRepository: createMockMomentRepository(overrides.momentRepository),
    };
  }

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
});

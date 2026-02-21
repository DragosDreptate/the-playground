import { describe, it, expect, vi } from "vitest";
import { getMomentComments } from "@/domain/usecases/get-moment-comments";
import {
  createMockCommentRepository,
  makeCommentWithUser,
} from "./helpers/mock-comment-repository";

describe("GetMomentComments", () => {
  describe("given a Moment with multiple comments", () => {
    it("should return comments with user data in repository order", async () => {
      const comments = [
        makeCommentWithUser({
          id: "comment-1",
          content: "Great event!",
          createdAt: new Date("2026-01-01T10:00:00Z"),
        }),
        makeCommentWithUser({
          id: "comment-2",
          content: "Looking forward to it.",
          createdAt: new Date("2026-01-01T11:00:00Z"),
          user: {
            id: "user-2",
            firstName: "Bob",
            lastName: "Martin",
            email: "bob@example.com",
            image: null,
          },
        }),
      ];
      const commentRepository = createMockCommentRepository({
        findByMomentIdWithUser: vi.fn().mockResolvedValue(comments),
      });

      const result = await getMomentComments(
        { momentId: "moment-1" },
        { commentRepository }
      );

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe("Great event!");
      expect(result[0].user.firstName).toBe("Alice");
      expect(result[1].content).toBe("Looking forward to it.");
      expect(result[1].user.firstName).toBe("Bob");
      expect(commentRepository.findByMomentIdWithUser).toHaveBeenCalledWith(
        "moment-1"
      );
    });
  });

  describe("given a Moment with no comments", () => {
    it("should return an empty array", async () => {
      const commentRepository = createMockCommentRepository({
        findByMomentIdWithUser: vi.fn().mockResolvedValue([]),
      });

      const result = await getMomentComments(
        { momentId: "moment-empty" },
        { commentRepository }
      );

      expect(result).toEqual([]);
      expect(commentRepository.findByMomentIdWithUser).toHaveBeenCalledWith(
        "moment-empty"
      );
    });
  });

  describe("given a comment with a user who has no avatar", () => {
    it("should return the comment with image set to null", async () => {
      const comment = makeCommentWithUser({
        user: {
          id: "user-1",
          firstName: "Claire",
          lastName: "Leroy",
          email: "claire@example.com",
          image: null,
        },
      });
      const commentRepository = createMockCommentRepository({
        findByMomentIdWithUser: vi.fn().mockResolvedValue([comment]),
      });

      const result = await getMomentComments(
        { momentId: "moment-1" },
        { commentRepository }
      );

      expect(result[0].user.image).toBeNull();
    });
  });
});

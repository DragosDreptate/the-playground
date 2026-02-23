import { describe, it, expect, vi } from "vitest";
import { deleteAccount } from "@/domain/usecases/delete-account";
import { UserNotFoundError } from "@/domain/errors";
import { createMockUserRepository, makeUser } from "./helpers/mock-user-repository";

describe("DeleteAccount", () => {
  describe("given a non-existing user", () => {
    it("should throw UserNotFoundError", async () => {
      const repo = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(null),
      });

      await expect(
        deleteAccount({ userId: "unknown-id" }, { userRepository: repo })
      ).rejects.toThrow(UserNotFoundError);
    });

    it("should not call delete when user is not found", async () => {
      const repo = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(null),
      });

      await expect(
        deleteAccount({ userId: "unknown-id" }, { userRepository: repo })
      ).rejects.toThrow();

      expect(repo.delete).not.toHaveBeenCalled();
    });
  });

  describe("given an existing user", () => {
    it("should call userRepository.delete with the correct userId", async () => {
      const user = makeUser({ id: "user-42" });
      const repo = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(user),
        delete: vi.fn().mockResolvedValue(undefined),
      });

      await deleteAccount({ userId: "user-42" }, { userRepository: repo });

      expect(repo.delete).toHaveBeenCalledWith("user-42");
      expect(repo.delete).toHaveBeenCalledTimes(1);
    });

    it("should resolve without a return value", async () => {
      const user = makeUser({ id: "user-42" });
      const repo = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(user),
        delete: vi.fn().mockResolvedValue(undefined),
      });

      const result = await deleteAccount(
        { userId: "user-42" },
        { userRepository: repo }
      );

      expect(result).toBeUndefined();
    });
  });
});

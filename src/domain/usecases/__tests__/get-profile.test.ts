import { describe, it, expect, vi } from "vitest";
import { getProfile } from "@/domain/usecases/get-profile";
import { UserNotFoundError } from "@/domain/errors";
import { createMockUserRepository, makeUser } from "./helpers/mock-user-repository";

describe("GetProfile", () => {
  describe("given an existing user", () => {
    it("should return the user", async () => {
      const user = makeUser({ id: "user-1", email: "alice@example.com" });
      const repo = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(user),
      });

      const result = await getProfile(
        { userId: "user-1" },
        { userRepository: repo }
      );

      expect(result).toEqual(user);
      expect(repo.findById).toHaveBeenCalledWith("user-1");
    });
  });

  describe("given a non-existing user", () => {
    it("should throw UserNotFoundError", async () => {
      const repo = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(null),
      });

      await expect(
        getProfile({ userId: "unknown" }, { userRepository: repo })
      ).rejects.toThrow(UserNotFoundError);
    });
  });
});

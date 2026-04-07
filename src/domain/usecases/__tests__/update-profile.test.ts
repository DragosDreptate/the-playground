import { describe, it, expect, vi } from "vitest";
import { updateProfile } from "@/domain/usecases/update-profile";
import { UserNotFoundError } from "@/domain/errors";
import { createMockUserRepository, makeUser } from "./helpers/mock-user-repository";

describe("UpdateProfile", () => {
  const defaultInput = {
    userId: "user-1",
    firstName: "Alice",
    lastName: "Dupont",
  };

  describe("given an existing user", () => {
    it("should update firstName and lastName", async () => {
      const existing = makeUser({ id: "user-1" });
      const updated = makeUser({
        id: "user-1",
        firstName: "Alice",
        lastName: "Dupont",
        onboardingCompleted: true,
      });
      const repo = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(existing),
        updateProfile: vi.fn().mockResolvedValue(updated),
      });

      const result = await updateProfile(defaultInput, {
        userRepository: repo,
      });

      expect(repo.updateProfile).toHaveBeenCalledWith("user-1", {
        firstName: "Alice",
        lastName: "Dupont",
      });
      expect(result.firstName).toBe("Alice");
      expect(result.lastName).toBe("Dupont");
      expect(result.onboardingCompleted).toBe(true);
    });

    it("should pass optional name if provided", async () => {
      const existing = makeUser({ id: "user-1" });
      const repo = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(existing),
        updateProfile: vi.fn().mockResolvedValue(
          makeUser({ firstName: "Alice", lastName: "Dupont", name: "Alice D." })
        ),
      });

      await updateProfile(
        { ...defaultInput, name: "Alice D." },
        { userRepository: repo }
      );

      expect(repo.updateProfile).toHaveBeenCalledWith("user-1", {
        firstName: "Alice",
        lastName: "Dupont",
        name: "Alice D.",
      });
    });

    it("should pass optional image if provided", async () => {
      const existing = makeUser({ id: "user-1" });
      const avatarUrl =
        "https://abc.public.blob.vercel-storage.com/avatars/user-1-123.webp";
      const repo = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(existing),
        updateProfile: vi.fn().mockResolvedValue(
          makeUser({ firstName: "Alice", lastName: "Dupont", image: avatarUrl })
        ),
      });

      await updateProfile(
        { ...defaultInput, image: avatarUrl },
        { userRepository: repo }
      );

      expect(repo.updateProfile).toHaveBeenCalledWith("user-1", {
        firstName: "Alice",
        lastName: "Dupont",
        image: avatarUrl,
      });
    });

    it("should not include image in updateProfile call when image is not provided", async () => {
      const existing = makeUser({ id: "user-1" });
      const repo = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(existing),
        updateProfile: vi.fn().mockResolvedValue(makeUser({ id: "user-1" })),
      });

      await updateProfile(defaultInput, { userRepository: repo });

      const [, profileInput] = (repo.updateProfile as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(profileInput).not.toHaveProperty("image");
    });

    it("should pass bio, city, and social links when provided", async () => {
      const existing = makeUser({ id: "user-1" });
      const repo = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(existing),
        updateProfile: vi.fn().mockResolvedValue(
          makeUser({
            id: "user-1",
            bio: "Dev React",
            city: "Paris",
            website: "https://example.com",
          })
        ),
      });

      await updateProfile(
        {
          ...defaultInput,
          bio: "Dev React",
          city: "Paris",
          website: "https://example.com",
          linkedinUrl: "https://linkedin.com/in/test",
          twitterUrl: null,
          githubUrl: null,
        },
        { userRepository: repo }
      );

      expect(repo.updateProfile).toHaveBeenCalledWith("user-1", {
        firstName: "Alice",
        lastName: "Dupont",
        bio: "Dev React",
        city: "Paris",
        website: "https://example.com",
        linkedinUrl: "https://linkedin.com/in/test",
        twitterUrl: null,
        githubUrl: null,
      });
    });

    it("should not include bio/city/socialLinks when not provided", async () => {
      const existing = makeUser({ id: "user-1" });
      const repo = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(existing),
        updateProfile: vi.fn().mockResolvedValue(makeUser({ id: "user-1" })),
      });

      await updateProfile(defaultInput, { userRepository: repo });

      const [, profileInput] = (repo.updateProfile as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(profileInput).not.toHaveProperty("bio");
      expect(profileInput).not.toHaveProperty("city");
      expect(profileInput).not.toHaveProperty("website");
      expect(profileInput).not.toHaveProperty("linkedinUrl");
    });
  });

  describe("given a non-existing user", () => {
    it("should throw UserNotFoundError", async () => {
      const repo = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(null),
      });

      await expect(
        updateProfile(defaultInput, { userRepository: repo })
      ).rejects.toThrow(UserNotFoundError);
    });
  });
});

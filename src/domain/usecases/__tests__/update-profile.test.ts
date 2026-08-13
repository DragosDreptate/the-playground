import { describe, it, expect, vi } from "vitest";
import { updateProfile, BIO_MAX_LENGTH } from "@/domain/usecases/update-profile";
import { BioTooLongError, UserNotFoundError } from "@/domain/errors";
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

  describe("given a bio submitted from an HTML form", () => {
    async function updateWithBio(bio: string) {
      const repo = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(makeUser({ id: "user-1" })),
        updateProfile: vi.fn().mockResolvedValue(makeUser({ id: "user-1" })),
      });

      await updateProfile({ ...defaultInput, bio }, { userRepository: repo });

      const [, profileInput] = (
        repo.updateProfile as ReturnType<typeof vi.fn>
      ).mock.calls[0];
      return profileInput.bio as string;
    }

    it("should normalize CRLF line breaks to LF", async () => {
      expect(await updateWithBio("Chess Club\r\n\r\nPhuket")).toBe(
        "Chess Club\n\nPhuket"
      );
    });

    it("should accept a bio that fits the cap only once line breaks are normalized", async () => {
      // 158 caractères tels que comptés par le navigateur, 162 tels que postés
      // par le formulaire : sans normalisation, la colonne les rejetterait.
      const asTypedInTheBrowser = `${"a".repeat(154)}\n\n\n\n`;
      const asPostedByTheForm = `${"a".repeat(154)}\r\n\r\n\r\n\r\n`;
      expect(asTypedInTheBrowser.length).toBe(158);
      expect(asPostedByTheForm.length).toBe(162);

      const saved = await updateWithBio(asPostedByTheForm);

      expect(saved).toBe(asTypedInTheBrowser);
      expect(saved.length).toBeLessThanOrEqual(BIO_MAX_LENGTH);
    });

    it("should accept a bio at exactly the cap", async () => {
      const bio = "a".repeat(BIO_MAX_LENGTH);

      expect(await updateWithBio(bio)).toBe(bio);
    });
  });

  describe("given a bio above the cap", () => {
    it("should throw BioTooLongError without touching the repository", async () => {
      const repo = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(makeUser({ id: "user-1" })),
        updateProfile: vi.fn(),
      });

      await expect(
        updateProfile(
          { ...defaultInput, bio: "a".repeat(BIO_MAX_LENGTH + 1) },
          { userRepository: repo }
        )
      ).rejects.toThrow(BioTooLongError);

      expect(repo.updateProfile).not.toHaveBeenCalled();
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

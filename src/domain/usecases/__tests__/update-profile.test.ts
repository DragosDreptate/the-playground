import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, vi } from "vitest";
import { updateProfile, BIO_MAX_LENGTH } from "@/domain/usecases/update-profile";
import { BioTooLongError, UserNotFoundError } from "@/domain/errors";
import { createMockUserRepository, makeUser } from "./helpers/mock-user-repository";

describe("BIO_MAX_LENGTH", () => {
  it("should match the width of the User.bio column", () => {
    // Le plafond applicatif est le SEUL garde-fou avant la colonne : s'il la
    // dépasse, Prisma remonte un P2000 et l'utilisateur perd tout son profil
    // (l'incident THE-PLAYGROUND-2E). Les deux valeurs bougent ensemble.
    const schema = readFileSync(
      join(process.cwd(), "prisma/schema.prisma"),
      "utf-8"
    );
    const column = schema.match(/^\s*bio\s+String\?\s+@db\.VarChar\((\d+)\)/m);

    expect(column).not.toBeNull();
    expect(Number(column![1])).toBe(BIO_MAX_LENGTH);
  });
});

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
      // Retours à la ligne INTÉRIEURS : la server action trime les extrémités,
      // seule cette forme atteint le usecase. Le navigateur compte 160, le
      // formulaire en poste 164 — sans normalisation, la colonne les rejette.
      const line = "a".repeat(52);
      const asTypedInTheBrowser = [line, line, line].join("\n\n");
      const asPostedByTheForm = [line, line, line].join("\r\n\r\n");
      expect(asTypedInTheBrowser.length).toBe(BIO_MAX_LENGTH);
      expect(asPostedByTheForm.length).toBe(BIO_MAX_LENGTH + 4);

      const saved = await updateWithBio(asPostedByTheForm);

      expect(saved).toBe(asTypedInTheBrowser);
      expect(saved.length).toBe(BIO_MAX_LENGTH);
    });

    it("should reproduce the production incident (Sentry THE-PLAYGROUND-2E)", async () => {
      const asPostedByTheForm =
        "Bringing chess players together in Phuket!\r\n\r\nPlay • Learn • Compete • Connect\r\n♟️ All levels welcome — from beginners to experienced players.\r\n📍 Phuket, Thailand";

      const saved = await updateWithBio(asPostedByTheForm);

      expect(saved).not.toContain("\r");
      expect(Array.from(saved).length).toBeLessThanOrEqual(BIO_MAX_LENGTH);
    });

    it("should accept a bio at exactly the cap", async () => {
      const bio = "a".repeat(BIO_MAX_LENGTH);

      expect(await updateWithBio(bio)).toBe(bio);
    });

    it("should count characters the way Postgres does, not UTF-16 units", async () => {
      // 160 caractères pour la colonne, 320 unités UTF-16 pour `String.length` :
      // un décompte naïf rejetterait une bio que la colonne accepte, et ferait
      // perdre TOUT le profil au passage.
      const bio = "📍".repeat(BIO_MAX_LENGTH);
      expect(bio.length).toBe(BIO_MAX_LENGTH * 2);
      expect(Array.from(bio).length).toBe(BIO_MAX_LENGTH);

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

    it("should reject a forged payload without walking through it", async () => {
      const repo = createMockUserRepository({
        findById: vi.fn().mockResolvedValue(makeUser({ id: "user-1" })),
        updateProfile: vi.fn(),
      });

      await expect(
        updateProfile(
          { ...defaultInput, bio: "a".repeat(1_000_000) },
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

import { describe, it, expect, vi } from "vitest";
import { createCircle } from "@/domain/usecases/create-circle";
import { SlugAlreadyExistsError } from "@/domain/errors";
import {
  createMockCircleRepository,
  makeCircle,
} from "./helpers/mock-circle-repository";

describe("CreateCircle", () => {
  const defaultInput = {
    name: "My Circle",
    description: "A community for testing",
    visibility: "PUBLIC" as const,
    userId: "user-1",
  };

  describe("given a valid input with a unique name", () => {
    it("should create the circle with a generated slug via createWithHostMembership", async () => {
      const repo = createMockCircleRepository({
        createWithHostMembership: vi.fn().mockResolvedValue(
          makeCircle({ name: "My Circle", slug: "my-circle" })
        ),
      });

      const result = await createCircle(defaultInput, {
        circleRepository: repo,
      });

      expect(repo.createWithHostMembership).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "My Circle",
          slug: "my-circle",
          description: "A community for testing",
          visibility: "PUBLIC",
        }),
        "user-1"
      );
      expect(result.circle.name).toBe("My Circle");
    });

    it("should pass coverImage and coverImageAttribution when provided", async () => {
      const attribution = { name: "John Doe", url: "https://unsplash.com/@johndoe" };
      const repo = createMockCircleRepository({
        createWithHostMembership: vi.fn().mockResolvedValue(
          makeCircle({ coverImage: "https://blob.example.com/cover.webp", coverImageAttribution: attribution })
        ),
      });

      await createCircle(
        { ...defaultInput, coverImage: "https://blob.example.com/cover.webp", coverImageAttribution: attribution },
        { circleRepository: repo }
      );

      expect(repo.createWithHostMembership).toHaveBeenCalledWith(
        expect.objectContaining({
          coverImage: "https://blob.example.com/cover.webp",
          coverImageAttribution: attribution,
        }),
        "user-1"
      );
    });

    it("should create the Circle and HOST membership atomically (no separate addMembership call)", async () => {
      const repo = createMockCircleRepository({
        createWithHostMembership: vi.fn().mockResolvedValue(makeCircle({ id: "new-circle-id" })),
      });

      await createCircle(defaultInput, { circleRepository: repo });

      expect(repo.createWithHostMembership).toHaveBeenCalledWith(
        expect.objectContaining({}),
        "user-1"
      );
      // addMembership ne doit plus être appelé séparément
      expect(repo.addMembership).not.toHaveBeenCalled();
    });
  });

  describe("given a valid input with category and city", () => {
    it("should pass category and city to the repository", async () => {
      const repo = createMockCircleRepository({
        createWithHostMembership: vi.fn().mockImplementation((input) =>
          Promise.resolve(makeCircle({ ...input }))
        ),
      });

      await createCircle(
        { ...defaultInput, category: "TECH", city: "Paris" },
        { circleRepository: repo }
      );

      expect(repo.createWithHostMembership).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "TECH",
          city: "Paris",
        }),
        "user-1"
      );
    });

    it("should not include category or city when not provided", async () => {
      const repo = createMockCircleRepository({
        createWithHostMembership: vi.fn().mockResolvedValue(makeCircle()),
      });

      await createCircle(defaultInput, { circleRepository: repo });

      const [callArg] = (repo.createWithHostMembership as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArg).not.toHaveProperty("category");
      expect(callArg).not.toHaveProperty("city");
    });
  });

  describe("given a name whose slug already exists", () => {
    it("should append a suffix to make the slug unique", async () => {
      const repo = createMockCircleRepository({
        slugExists: vi
          .fn()
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(false),
        createWithHostMembership: vi.fn().mockImplementation((input) =>
          Promise.resolve(makeCircle({ slug: input.slug }))
        ),
      });

      const result = await createCircle(defaultInput, {
        circleRepository: repo,
      });

      expect(result.circle.slug).toMatch(/^my-circle-[a-z0-9]+$/);
    });

    it("should throw SlugAlreadyExistsError if suffixed slug also exists", async () => {
      const repo = createMockCircleRepository({
        slugExists: vi.fn().mockResolvedValue(true),
      });

      await expect(
        createCircle(defaultInput, { circleRepository: repo })
      ).rejects.toThrow(SlugAlreadyExistsError);
    });
  });
});

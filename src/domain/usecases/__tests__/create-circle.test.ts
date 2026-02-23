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
    it("should create the circle with a generated slug", async () => {
      const repo = createMockCircleRepository({
        create: vi.fn().mockResolvedValue(
          makeCircle({ name: "My Circle", slug: "my-circle" })
        ),
      });

      const result = await createCircle(defaultInput, {
        circleRepository: repo,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "My Circle",
          slug: "my-circle",
          description: "A community for testing",
          visibility: "PUBLIC",
        })
      );
      expect(result.circle.name).toBe("My Circle");
    });

    it("should pass coverImage and coverImageAttribution when provided", async () => {
      const attribution = { name: "John Doe", url: "https://unsplash.com/@johndoe" };
      const repo = createMockCircleRepository({
        create: vi.fn().mockResolvedValue(
          makeCircle({ coverImage: "https://blob.example.com/cover.webp", coverImageAttribution: attribution })
        ),
      });

      await createCircle(
        { ...defaultInput, coverImage: "https://blob.example.com/cover.webp", coverImageAttribution: attribution },
        { circleRepository: repo }
      );

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          coverImage: "https://blob.example.com/cover.webp",
          coverImageAttribution: attribution,
        })
      );
    });

    it("should add the creator as HOST", async () => {
      const created = makeCircle({ id: "new-circle-id" });
      const repo = createMockCircleRepository({
        create: vi.fn().mockResolvedValue(created),
      });

      await createCircle(defaultInput, { circleRepository: repo });

      expect(repo.addMembership).toHaveBeenCalledWith(
        "new-circle-id",
        "user-1",
        "HOST"
      );
    });
  });

  describe("given a name whose slug already exists", () => {
    it("should append a suffix to make the slug unique", async () => {
      const repo = createMockCircleRepository({
        slugExists: vi
          .fn()
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(false),
        create: vi.fn().mockImplementation((input) =>
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

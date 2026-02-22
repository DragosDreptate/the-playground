import { describe, it, expect } from "vitest";
import { isUploadedUrl } from "@/lib/blob";

describe("isUploadedUrl", () => {
  describe("given a Vercel Blob URL", () => {
    it("should return true", () => {
      expect(
        isUploadedUrl(
          "https://abc123.public.blob.vercel-storage.com/avatars/user-1-1700000000.webp"
        )
      ).toBe(true);
    });

    it("should return true for any path under vercel-storage.com", () => {
      expect(
        isUploadedUrl("https://xyz.public.blob.vercel-storage.com/avatars/foo.jpg")
      ).toBe(true);
    });
  });

  describe("given an OAuth provider avatar URL", () => {
    it("should return false for a Google avatar URL", () => {
      expect(
        isUploadedUrl(
          "https://lh3.googleusercontent.com/a/ACg8ocIKr5sSomeHash=s96-c"
        )
      ).toBe(false);
    });

    it("should return false for a GitHub avatar URL", () => {
      expect(
        isUploadedUrl("https://avatars.githubusercontent.com/u/12345678?v=4")
      ).toBe(false);
    });
  });

  describe("given null or undefined", () => {
    it("should return false for null", () => {
      expect(isUploadedUrl(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isUploadedUrl(undefined)).toBe(false);
    });

    it("should return false for an empty string", () => {
      expect(isUploadedUrl("")).toBe(false);
    });
  });
});

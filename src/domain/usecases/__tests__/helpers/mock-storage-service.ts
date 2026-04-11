import type { StorageService } from "@/domain/ports/services/storage-service";
import { vi } from "vitest";

export function createMockStorageService(
  overrides: Partial<StorageService> = {}
): StorageService {
  return {
    upload: vi
      .fn<StorageService["upload"]>()
      .mockImplementation(async (path) =>
        `https://public.blob.vercel-storage.com/${path}`
      ),
    delete: vi.fn<StorageService["delete"]>().mockResolvedValue(undefined),
    ...overrides,
  };
}

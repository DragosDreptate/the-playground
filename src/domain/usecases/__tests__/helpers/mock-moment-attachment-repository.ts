import type { MomentAttachmentRepository } from "@/domain/ports/repositories/moment-attachment-repository";
import type { MomentAttachment } from "@/domain/models/moment-attachment";
import { vi } from "vitest";

export function createMockMomentAttachmentRepository(
  overrides: Partial<MomentAttachmentRepository> = {}
): MomentAttachmentRepository {
  return {
    create: vi
      .fn<MomentAttachmentRepository["create"]>()
      .mockResolvedValue(makeAttachment()),
    findById: vi
      .fn<MomentAttachmentRepository["findById"]>()
      .mockResolvedValue(null),
    findByMoment: vi
      .fn<MomentAttachmentRepository["findByMoment"]>()
      .mockResolvedValue([]),
    countByMoment: vi
      .fn<MomentAttachmentRepository["countByMoment"]>()
      .mockResolvedValue(0),
    delete: vi
      .fn<MomentAttachmentRepository["delete"]>()
      .mockResolvedValue(undefined),
    ...overrides,
  };
}

export function makeAttachment(
  overrides: Partial<MomentAttachment> = {}
): MomentAttachment {
  return {
    id: "attachment-1",
    momentId: "moment-1",
    url: "https://public.blob.vercel-storage.com/moment-attachments/moment-1-123-file.pdf",
    filename: "file.pdf",
    contentType: "application/pdf",
    sizeBytes: 1024,
    createdAt: new Date("2026-04-11"),
    ...overrides,
  };
}

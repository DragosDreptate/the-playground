import type { MomentAttachment } from "@/domain/models/moment-attachment";
import {
  MAX_ATTACHMENTS_PER_MOMENT,
  MAX_ATTACHMENT_SIZE_BYTES,
  ALLOWED_ATTACHMENT_CONTENT_TYPES,
} from "@/domain/models/moment-attachment";
import type { MomentAttachmentRepository } from "@/domain/ports/repositories/moment-attachment-repository";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { StorageService } from "@/domain/ports/services/storage-service";
import {
  MomentNotFoundError,
  UnauthorizedMomentActionError,
  AttachmentLimitReachedError,
  AttachmentTooLargeError,
  AttachmentTypeNotAllowedError,
} from "@/domain/errors";

type AddMomentAttachmentInput = {
  momentId: string;
  userId: string;
  file: {
    buffer: Buffer;
    filename: string;
    contentType: string;
    sizeBytes: number;
  };
};

type AddMomentAttachmentDeps = {
  attachmentRepository: MomentAttachmentRepository;
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
  storage: StorageService;
};

export async function addMomentAttachment(
  input: AddMomentAttachmentInput,
  deps: AddMomentAttachmentDeps
): Promise<MomentAttachment> {
  const { attachmentRepository, momentRepository, circleRepository, storage } =
    deps;

  // Cheap input validation first — fail fast before any DB round-trip.
  if (!ALLOWED_ATTACHMENT_CONTENT_TYPES.has(input.file.contentType)) {
    throw new AttachmentTypeNotAllowedError(input.file.contentType);
  }
  if (input.file.sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new AttachmentTooLargeError(MAX_ATTACHMENT_SIZE_BYTES);
  }

  const moment = await momentRepository.findById(input.momentId);
  if (!moment) {
    throw new MomentNotFoundError(input.momentId);
  }

  const [membership, count] = await Promise.all([
    circleRepository.findMembership(moment.circleId, input.userId),
    attachmentRepository.countByMoment(input.momentId),
  ]);

  if (!membership || membership.role !== "HOST") {
    throw new UnauthorizedMomentActionError();
  }
  if (count >= MAX_ATTACHMENTS_PER_MOMENT) {
    throw new AttachmentLimitReachedError(MAX_ATTACHMENTS_PER_MOMENT);
  }

  // Format is preserved (no WebP conversion, unlike cover images) so
  // participants download a bit-identical copy of what the host uploaded.
  const safeFilename = sanitizeFilename(input.file.filename);
  const path = `moment-attachments/${input.momentId}-${Date.now()}-${safeFilename}`;
  const url = await storage.upload(path, input.file.buffer, input.file.contentType);

  return attachmentRepository.create({
    momentId: input.momentId,
    url,
    filename: input.file.filename,
    contentType: input.file.contentType,
    sizeBytes: input.file.sizeBytes,
  });
}

function sanitizeFilename(filename: string): string {
  const ascii = filename.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const safe = ascii
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return safe.length > 0 ? safe : "file";
}

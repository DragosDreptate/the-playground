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

/**
 * Adds a new attachment (PDF or image) to an event.
 *
 * Rules:
 * - Only HOST members of the Moment's Circle can add attachments
 * - Max 3 attachments per Moment (MAX_ATTACHMENTS_PER_MOMENT)
 * - Max 10 MB per file (MAX_ATTACHMENT_SIZE_BYTES)
 * - Allowed types: PDF, JPEG, PNG, WEBP (ALLOWED_ATTACHMENT_CONTENT_TYPES)
 *
 * Storage path: `moment-attachments/${momentId}-${Date.now()}-${safeFilename}`
 */
export async function addMomentAttachment(
  input: AddMomentAttachmentInput,
  deps: AddMomentAttachmentDeps
): Promise<MomentAttachment> {
  const { attachmentRepository, momentRepository, circleRepository, storage } =
    deps;

  // 1. Moment exists
  const moment = await momentRepository.findById(input.momentId);
  if (!moment) {
    throw new MomentNotFoundError(input.momentId);
  }

  // 2. Ownership: user must be HOST of the Circle
  const membership = await circleRepository.findMembership(
    moment.circleId,
    input.userId
  );
  if (!membership || membership.role !== "HOST") {
    throw new UnauthorizedMomentActionError();
  }

  // 3. Type check
  if (!ALLOWED_ATTACHMENT_CONTENT_TYPES.has(input.file.contentType)) {
    throw new AttachmentTypeNotAllowedError(input.file.contentType);
  }

  // 4. Size check
  if (input.file.sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new AttachmentTooLargeError(MAX_ATTACHMENT_SIZE_BYTES);
  }

  // 5. Limit check
  const count = await attachmentRepository.countByMoment(input.momentId);
  if (count >= MAX_ATTACHMENTS_PER_MOMENT) {
    throw new AttachmentLimitReachedError(MAX_ATTACHMENTS_PER_MOMENT);
  }

  // 6. Upload to storage (format preserved, no conversion)
  const safeFilename = sanitizeFilename(input.file.filename);
  const path = `moment-attachments/${input.momentId}-${Date.now()}-${safeFilename}`;
  const url = await storage.upload(path, input.file.buffer, input.file.contentType);

  // 7. Persist — keep the ORIGINAL filename for display (not the sanitized one)
  return attachmentRepository.create({
    momentId: input.momentId,
    url,
    filename: input.file.filename,
    contentType: input.file.contentType,
    sizeBytes: input.file.sizeBytes,
  });
}

/**
 * Sanitizes a filename for use in a URL path:
 * - Strips non-ASCII characters (accents, emoji)
 * - Replaces spaces and sequences of non-safe chars with "-"
 * - Trims leading/trailing "-"
 * - Fallback to "file" if the result is empty
 */
function sanitizeFilename(filename: string): string {
  // eslint-disable-next-line no-control-regex
  const ascii = filename.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const safe = ascii
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return safe.length > 0 ? safe : "file";
}

import type { MomentAttachment } from "@/domain/models/moment-attachment";
import {
  MAX_ATTACHMENTS_PER_MOMENT,
  ALLOWED_ATTACHMENT_CONTENT_TYPES,
  maxSizeForContentType,
} from "@/domain/models/moment-attachment";
import { isActiveOrganizer } from "@/domain/models/circle";
import type { MomentAttachmentRepository } from "@/domain/ports/repositories/moment-attachment-repository";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import {
  MomentNotFoundError,
  UnauthorizedMomentActionError,
  AttachmentLimitReachedError,
  AttachmentTooLargeError,
  AttachmentTypeNotAllowedError,
} from "@/domain/errors";

/**
 * The file is already on Blob storage (client-direct upload) by the time this
 * runs. The usecase validates the metadata and the host's permission, then
 * persists the row — it no longer performs the upload itself.
 */
type AddMomentAttachmentInput = {
  momentId: string;
  userId: string;
  url: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

type AddMomentAttachmentDeps = {
  attachmentRepository: MomentAttachmentRepository;
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
};

export async function addMomentAttachment(
  input: AddMomentAttachmentInput,
  deps: AddMomentAttachmentDeps
): Promise<MomentAttachment> {
  const { attachmentRepository, momentRepository, circleRepository } = deps;

  // Cheap input validation first — fail fast before any DB round-trip.
  if (!ALLOWED_ATTACHMENT_CONTENT_TYPES.has(input.contentType)) {
    throw new AttachmentTypeNotAllowedError(input.contentType);
  }
  const maxSize = maxSizeForContentType(input.contentType);
  if (input.sizeBytes > maxSize) {
    throw new AttachmentTooLargeError(maxSize);
  }

  const moment = await momentRepository.findById(input.momentId);
  if (!moment) {
    throw new MomentNotFoundError(input.momentId);
  }

  const [membership, count] = await Promise.all([
    circleRepository.findMembership(moment.circleId, input.userId),
    attachmentRepository.countByMoment(input.momentId),
  ]);

  if (!isActiveOrganizer(membership)) {
    throw new UnauthorizedMomentActionError();
  }
  if (count >= MAX_ATTACHMENTS_PER_MOMENT) {
    throw new AttachmentLimitReachedError(MAX_ATTACHMENTS_PER_MOMENT);
  }

  return attachmentRepository.create({
    momentId: input.momentId,
    url: input.url,
    filename: input.filename,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
  });
}

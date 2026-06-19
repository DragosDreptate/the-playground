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
  AttachmentTypeNotAllowedError,
} from "@/domain/errors";

type AuthorizeMomentAttachmentUploadInput = {
  momentId: string;
  userId: string;
  contentType: string;
};

type AuthorizeMomentAttachmentUploadDeps = {
  attachmentRepository: MomentAttachmentRepository;
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
};

/**
 * Authorizes a client-direct upload BEFORE the file leaves the browser:
 * checks the content type, the host permission and the per-moment limit, and
 * returns the size cap to enforce on the upload token.
 *
 * Mirrors the checks in addMomentAttachment (the authoritative validation at
 * confirmation time), so a forbidden or over-quota upload never starts.
 */
export async function authorizeMomentAttachmentUpload(
  input: AuthorizeMomentAttachmentUploadInput,
  deps: AuthorizeMomentAttachmentUploadDeps
): Promise<{ maxSizeBytes: number }> {
  const { attachmentRepository, momentRepository, circleRepository } = deps;

  if (!ALLOWED_ATTACHMENT_CONTENT_TYPES.has(input.contentType)) {
    throw new AttachmentTypeNotAllowedError(input.contentType);
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

  return { maxSizeBytes: maxSizeForContentType(input.contentType) };
}

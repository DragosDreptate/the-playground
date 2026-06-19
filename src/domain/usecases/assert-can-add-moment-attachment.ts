import {
  MAX_ATTACHMENTS_PER_MOMENT,
  ALLOWED_ATTACHMENT_CONTENT_TYPES,
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

export type MomentAttachmentAuthDeps = {
  attachmentRepository: MomentAttachmentRepository;
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
};

/**
 * Shared guard for adding an attachment to a moment: the content type is
 * allowed, the moment exists, the user is an active organizer (HOST/CO_HOST)
 * and the per-moment limit is not reached.
 *
 * Used at two points so the rule is defined once: when authorizing the upload
 * token (before the file leaves the browser) and when persisting at
 * confirmation. The size cap is NOT checked here — callers apply it via
 * maxSizeForContentType (the authorization returns it, the persistence enforces
 * it on the real byte size).
 */
export async function assertCanAddMomentAttachment(
  input: { momentId: string; userId: string; contentType: string },
  deps: MomentAttachmentAuthDeps
): Promise<void> {
  if (!ALLOWED_ATTACHMENT_CONTENT_TYPES.has(input.contentType)) {
    throw new AttachmentTypeNotAllowedError(input.contentType);
  }

  const moment = await deps.momentRepository.findById(input.momentId);
  if (!moment) {
    throw new MomentNotFoundError(input.momentId);
  }

  const [membership, count] = await Promise.all([
    deps.circleRepository.findMembership(moment.circleId, input.userId),
    deps.attachmentRepository.countByMoment(input.momentId),
  ]);

  if (!isActiveOrganizer(membership)) {
    throw new UnauthorizedMomentActionError();
  }
  if (count >= MAX_ATTACHMENTS_PER_MOMENT) {
    throw new AttachmentLimitReachedError(MAX_ATTACHMENTS_PER_MOMENT);
  }
}

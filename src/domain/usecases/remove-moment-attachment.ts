import type { MomentAttachmentRepository } from "@/domain/ports/repositories/moment-attachment-repository";
import type { MomentRepository } from "@/domain/ports/repositories/moment-repository";
import type { CircleRepository } from "@/domain/ports/repositories/circle-repository";
import type { StorageService } from "@/domain/ports/services/storage-service";
import {
  AttachmentNotFoundError,
  UnauthorizedMomentActionError,
  MomentNotFoundError,
} from "@/domain/errors";

type RemoveMomentAttachmentInput = {
  attachmentId: string;
  userId: string;
};

type RemoveMomentAttachmentDeps = {
  attachmentRepository: MomentAttachmentRepository;
  momentRepository: MomentRepository;
  circleRepository: CircleRepository;
  storage: StorageService;
};

/**
 * Removes an attachment: deletes the blob first, then the DB row.
 *
 * If the blob deletion fails, the DB row is NOT deleted (consistency).
 * Only HOST members of the Moment's Circle can remove attachments.
 */
export async function removeMomentAttachment(
  input: RemoveMomentAttachmentInput,
  deps: RemoveMomentAttachmentDeps
): Promise<void> {
  const { attachmentRepository, momentRepository, circleRepository, storage } =
    deps;

  // 1. Attachment exists
  const attachment = await attachmentRepository.findById(input.attachmentId);
  if (!attachment) {
    throw new AttachmentNotFoundError(input.attachmentId);
  }

  // 2. Load parent Moment to resolve the Circle
  const moment = await momentRepository.findById(attachment.momentId);
  if (!moment) {
    // Orphan attachment — should not happen but handle defensively
    throw new MomentNotFoundError(attachment.momentId);
  }

  // 3. Ownership check
  const membership = await circleRepository.findMembership(
    moment.circleId,
    input.userId
  );
  if (!membership || membership.role !== "HOST") {
    throw new UnauthorizedMomentActionError();
  }

  // 4. Delete blob first (if this fails, DB row remains — consistency)
  await storage.delete(attachment.url);

  // 5. Delete DB row
  await attachmentRepository.delete(attachment.id);
}

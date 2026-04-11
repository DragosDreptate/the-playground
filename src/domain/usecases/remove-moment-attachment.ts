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

export async function removeMomentAttachment(
  input: RemoveMomentAttachmentInput,
  deps: RemoveMomentAttachmentDeps
): Promise<void> {
  const { attachmentRepository, momentRepository, circleRepository, storage } =
    deps;

  const attachment = await attachmentRepository.findById(input.attachmentId);
  if (!attachment) {
    throw new AttachmentNotFoundError(input.attachmentId);
  }

  const moment = await momentRepository.findById(attachment.momentId);
  if (!moment) {
    throw new MomentNotFoundError(attachment.momentId);
  }

  const membership = await circleRepository.findMembership(
    moment.circleId,
    input.userId
  );
  if (!membership || membership.role !== "HOST") {
    throw new UnauthorizedMomentActionError();
  }

  // Delete the blob before the DB row: if the blob delete fails, the row
  // stays so the attachment is still recoverable — avoids orphan blobs.
  await storage.delete(attachment.url);
  await attachmentRepository.delete(attachment.id);
}

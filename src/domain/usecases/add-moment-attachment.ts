import type { MomentAttachment } from "@/domain/models/moment-attachment";
import { maxSizeForContentType } from "@/domain/models/moment-attachment";
import { AttachmentTooLargeError } from "@/domain/errors";
import {
  assertCanAddMomentAttachment,
  type MomentAttachmentAuthDeps,
} from "./assert-can-add-moment-attachment";

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

export async function addMomentAttachment(
  input: AddMomentAttachmentInput,
  deps: MomentAttachmentAuthDeps
): Promise<MomentAttachment> {
  await assertCanAddMomentAttachment(
    {
      momentId: input.momentId,
      userId: input.userId,
      contentType: input.contentType,
    },
    deps
  );

  const maxSize = maxSizeForContentType(input.contentType);
  if (input.sizeBytes > maxSize) {
    throw new AttachmentTooLargeError(maxSize);
  }

  return deps.attachmentRepository.create({
    momentId: input.momentId,
    url: input.url,
    filename: input.filename,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
  });
}

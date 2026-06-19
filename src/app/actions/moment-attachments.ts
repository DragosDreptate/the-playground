"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaMomentAttachmentRepository,
  prismaMomentRepository,
  prismaCircleRepository,
} from "@/infrastructure/repositories";
import { vercelBlobStorageService } from "@/infrastructure/services/storage/vercel-blob-storage-service";
import { addMomentAttachment } from "@/domain/usecases/add-moment-attachment";
import { removeMomentAttachment } from "@/domain/usecases/remove-moment-attachment";
import type { MomentAttachment } from "@/domain/models/moment-attachment";
import type { ActionResult } from "./types";
import { toActionResult } from "./helpers/to-action-result";

type ConfirmAttachmentInput = {
  url: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

/**
 * Persists an attachment after the file has been uploaded client-direct to
 * Blob (see /api/moments/attachments/upload). The host permission, content
 * type and size are re-validated by the usecase. If validation fails, the
 * already-uploaded blob is deleted to avoid an orphan in storage.
 */
export async function confirmMomentAttachmentAction(
  momentId: string,
  blob: ConfirmAttachmentInput
): Promise<ActionResult<MomentAttachment>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié", code: "UNAUTHORIZED" };
  }

  // Tie the confirmed URL to this moment's blob namespace: a host cannot
  // register an arbitrary external URL as one of their attachments.
  if (!blob.url.includes(`/moment-attachments/${momentId}/`)) {
    return { success: false, error: "URL invalide", code: "INVALID_URL" };
  }

  return toActionResult(async () => {
    try {
      const attachment = await addMomentAttachment(
        {
          momentId,
          userId: session.user.id,
          url: blob.url,
          filename: blob.filename,
          contentType: blob.contentType,
          sizeBytes: blob.sizeBytes,
        },
        {
          attachmentRepository: prismaMomentAttachmentRepository,
          momentRepository: prismaMomentRepository,
          circleRepository: prismaCircleRepository,
        }
      );
      revalidatePath(`/m/[slug]`, "page");
      return attachment;
    } catch (err) {
      // The blob is already on storage; validation rejected it → roll back so
      // it doesn't linger as an orphan.
      await vercelBlobStorageService
        .delete(blob.url)
        .catch((e) => Sentry.captureException(e));
      throw err;
    }
  }, "Erreur lors de l'envoi");
}

export async function deleteMomentAttachmentAction(
  attachmentId: string
): Promise<ActionResult<null>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié", code: "UNAUTHORIZED" };
  }

  return toActionResult(async () => {
    await removeMomentAttachment(
      { attachmentId, userId: session.user.id },
      {
        attachmentRepository: prismaMomentAttachmentRepository,
        momentRepository: prismaMomentRepository,
        circleRepository: prismaCircleRepository,
        storage: vercelBlobStorageService,
      }
    );
    revalidatePath(`/m/[slug]`, "page");
    return null;
  }, "Erreur lors de la suppression");
}

"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { fileTypeFromBuffer } from "file-type";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaMomentAttachmentRepository,
  prismaMomentRepository,
  prismaCircleRepository,
} from "@/infrastructure/repositories";
import { vercelBlobStorageService } from "@/infrastructure/services/storage/vercel-blob-storage-service";
import { addMomentAttachment } from "@/domain/usecases/add-moment-attachment";
import { removeMomentAttachment } from "@/domain/usecases/remove-moment-attachment";
import {
  ALLOWED_ATTACHMENT_CONTENT_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
} from "@/domain/models/moment-attachment";
import type { MomentAttachment } from "@/domain/models/moment-attachment";
import type { ActionResult } from "./types";
import { DomainError } from "@/domain/errors/domain-error";

/**
 * Uploads a new attachment to a Moment.
 * Called from the moment form options section (drag-and-drop or file picker).
 *
 * Security:
 * - Auth required
 * - Magic number check via file-type (prevents mime spoofing)
 * - Ownership check in the usecase (HOST only)
 * - Size check both in the action (early) and the usecase (defense in depth)
 */
export async function uploadMomentAttachmentAction(
  momentId: string,
  formData: FormData
): Promise<ActionResult<MomentAttachment>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié", code: "UNAUTHORIZED" };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Fichier manquant", code: "MISSING_FILE" };
  }

  // Early size check (avoid loading a huge file into memory if we know it's too big)
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return {
      success: false,
      error: `Fichier trop volumineux (max ${MAX_ATTACHMENT_SIZE_BYTES / 1024 / 1024} MB)`,
      code: "ATTACHMENT_TOO_LARGE",
    };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch (err) {
    Sentry.captureException(err);
    return {
      success: false,
      error: "Erreur de lecture du fichier",
      code: "READ_ERROR",
    };
  }

  // Magic number check: trust the actual bytes, not the declared contentType
  const detected = await fileTypeFromBuffer(buffer);
  const detectedMime = detected?.mime;
  if (!detectedMime || !ALLOWED_ATTACHMENT_CONTENT_TYPES.has(detectedMime)) {
    return {
      success: false,
      error: "Format non supporté",
      code: "ATTACHMENT_TYPE_NOT_ALLOWED",
    };
  }

  try {
    const attachment = await addMomentAttachment(
      {
        momentId,
        userId: session.user.id,
        file: {
          buffer,
          filename: file.name,
          contentType: detectedMime,
          sizeBytes: buffer.length,
        },
      },
      {
        attachmentRepository: prismaMomentAttachmentRepository,
        momentRepository: prismaMomentRepository,
        circleRepository: prismaCircleRepository,
        storage: vercelBlobStorageService,
      }
    );

    // Revalidate the public moment page so the new attachment appears
    revalidatePath(`/m/[slug]`, "page");

    return { success: true, data: attachment };
  } catch (err) {
    if (err instanceof DomainError) {
      return { success: false, error: err.message, code: err.code };
    }
    Sentry.captureException(err);
    return {
      success: false,
      error: "Erreur lors de l'envoi",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Deletes an attachment. HOST-only (enforced in the usecase).
 */
export async function deleteMomentAttachmentAction(
  attachmentId: string
): Promise<ActionResult<null>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié", code: "UNAUTHORIZED" };
  }

  try {
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

    return { success: true, data: null };
  } catch (err) {
    if (err instanceof DomainError) {
      return { success: false, error: err.message, code: err.code };
    }
    Sentry.captureException(err);
    return {
      success: false,
      error: "Erreur lors de la suppression",
      code: "INTERNAL_ERROR",
    };
  }
}


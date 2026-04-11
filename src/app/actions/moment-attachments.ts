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
import { prismaRateLimiter } from "@/infrastructure/services/rate-limiter/prisma-rate-limiter";
import { addMomentAttachment } from "@/domain/usecases/add-moment-attachment";
import { removeMomentAttachment } from "@/domain/usecases/remove-moment-attachment";
import {
  ALLOWED_ATTACHMENT_CONTENT_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
} from "@/domain/models/moment-attachment";
import type { MomentAttachment } from "@/domain/models/moment-attachment";
import type { ActionResult } from "./types";
import { toActionResult } from "./helpers/to-action-result";

const UPLOAD_RATE_LIMIT = { max: 10, windowMs: 60 * 1000 };

export async function uploadMomentAttachmentAction(
  momentId: string,
  formData: FormData
): Promise<ActionResult<MomentAttachment>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Non authentifié", code: "UNAUTHORIZED" };
  }

  const rate = await prismaRateLimiter.checkLimit(
    `attachment-upload:${session.user.id}`,
    UPLOAD_RATE_LIMIT.max,
    UPLOAD_RATE_LIMIT.windowMs
  );
  if (!rate.allowed) {
    return {
      success: false,
      error: "Trop de tentatives, réessayez dans quelques instants",
      code: "RATE_LIMITED",
    };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Fichier manquant", code: "MISSING_FILE" };
  }

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

  // Trust the actual bytes, not the client-declared contentType.
  const detected = await fileTypeFromBuffer(buffer);
  const detectedMime = detected?.mime;
  if (!detectedMime || !ALLOWED_ATTACHMENT_CONTENT_TYPES.has(detectedMime)) {
    return {
      success: false,
      error: "Format non supporté",
      code: "ATTACHMENT_TYPE_NOT_ALLOWED",
    };
  }

  return toActionResult(async () => {
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
    revalidatePath(`/m/[slug]`, "page");
    return attachment;
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

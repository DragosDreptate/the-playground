"use server";

import * as Sentry from "@sentry/nextjs";
import { getLocale, getTranslations } from "next-intl/server";
import { fileTypeFromBuffer } from "file-type";
import { auth } from "@/infrastructure/auth/auth.config";
import {
  prismaCommentRepository,
  prismaMomentRepository,
  prismaCircleRepository,
  prismaUserRepository,
  prismaRegistrationRepository,
  prismaCommentAttachmentRepository,
} from "@/infrastructure/repositories";
import { vercelBlobStorageService } from "@/infrastructure/services/storage/vercel-blob-storage-service";
import { createResendEmailService } from "@/infrastructure/services";
import { addComment } from "@/domain/usecases/add-comment";
import type { CommentPhotoInput } from "@/domain/usecases/add-comment";
import { deleteComment } from "@/domain/usecases/delete-comment";
import { notifySlackNewComment } from "@/infrastructure/services/slack/slack-notification-service";
import {
  ALLOWED_COMMENT_PHOTO_TYPES,
  MAX_COMMENT_PHOTO_SIZE_BYTES,
} from "@/domain/models/comment-attachment";
import type { Comment } from "@/domain/models/comment";
import type { ActionResult } from "./types";
import { toActionResult } from "./helpers/to-action-result";

const emailService = createResendEmailService();

export async function addCommentAction(
  momentId: string,
  formData: FormData
): Promise<ActionResult<Comment>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }
  const userId = session.user.id;

  const content = formData.get("content") as string | null;
  if (!content) {
    return { success: false, error: "Content missing", code: "MISSING_CONTENT" };
  }

  // Extract photo files from FormData (photo-0, photo-1, photo-2)
  const photoFiles: File[] = [];
  for (let i = 0; i < 3; i++) {
    const f = formData.get(`photo-${i}`) as File | null;
    if (f && f.size > 0) photoFiles.push(f);
  }

  // Validate and detect MIME for each photo
  let photos: CommentPhotoInput[] = [];
  if (photoFiles.length > 0) {
    try {
      photos = await Promise.all(
        photoFiles.map(async (file) => {
          const buffer = Buffer.from(await file.arrayBuffer());
          const detected = await fileTypeFromBuffer(buffer);
          if (
            !detected ||
            !ALLOWED_COMMENT_PHOTO_TYPES.has(detected.mime)
          ) {
            return {
              buffer,
              filename: file.name,
              contentType: "invalid",
              sizeBytes: buffer.length,
            };
          }
          return {
            buffer,
            filename: file.name,
            contentType: detected.mime,
            sizeBytes: buffer.length,
          };
        })
      );

      // Check for invalid types (detected in parallel above)
      const invalid = photos.find((p) => p.contentType === "invalid");
      if (invalid) {
        return {
          success: false,
          error: "Format non supporté",
          code: "COMMENT_PHOTO_TYPE_NOT_ALLOWED",
        };
      }

      // Check sizes
      const tooLarge = photos.find(
        (p) => p.sizeBytes > MAX_COMMENT_PHOTO_SIZE_BYTES
      );
      if (tooLarge) {
        return {
          success: false,
          error: "Photo trop volumineuse",
          code: "COMMENT_PHOTO_TOO_LARGE",
        };
      }
    } catch (err) {
      Sentry.captureException(err);
      return {
        success: false,
        error: "Erreur de lecture des photos",
        code: "READ_ERROR",
      };
    }
  }

  return toActionResult(async () => {
    const result = await addComment(
      { momentId, userId, content, photos },
      {
        commentRepository: prismaCommentRepository,
        momentRepository: prismaMomentRepository,
        registrationRepository: prismaRegistrationRepository,
        commentAttachmentRepository: prismaCommentAttachmentRepository,
        storage: vercelBlobStorageService,
      }
    );

    // Resolve i18n in the request context (before fire-and-forget)
    const locale = await getLocale();
    const t = await getTranslations("Email");

    sendCommentNotifications(momentId, userId, content, t, locale).catch(
      (err) => {
        console.error(err);
        Sentry.captureException(err);
      }
    );

    return result.comment;
  });
}

export async function deleteCommentAction(
  commentId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
  }
  const userId = session.user.id;

  return toActionResult(async () => {
    await deleteComment(
      { commentId, userId },
      {
        commentRepository: prismaCommentRepository,
        momentRepository: prismaMomentRepository,
        circleRepository: prismaCircleRepository,
        commentAttachmentRepository: prismaCommentAttachmentRepository,
        storage: vercelBlobStorageService,
      }
    );
  });
}

// --- Fire-and-forget email helpers ---

type TranslationFunction = Awaited<ReturnType<typeof getTranslations<"Email">>>;

async function sendCommentNotifications(
  momentId: string,
  commenterId: string,
  content: string,
  t: TranslationFunction,
  _locale: string
): Promise<void> {
  const [commenter, moment] = await Promise.all([
    prismaUserRepository.findById(commenterId),
    prismaMomentRepository.findById(momentId),
  ]);
  if (!commenter || !moment) return;

  const playerName =
    [commenter.firstName, commenter.lastName].filter(Boolean).join(" ") ||
    commenter.email;

  const commentPreview =
    content.length > 200 ? `${content.slice(0, 200)}…` : content;

  // Récupère inscrits actifs et hosts en parallèle
  const [registrations, hosts] = await Promise.all([
    prismaRegistrationRepository.findActiveWithUserByMomentId(momentId),
    prismaCircleRepository.findMembersByRole(moment.circleId, "HOST"),
  ]);

  // Combine inscrits + hosts, déduplique par userId
  type Recipient = { userId: string; name: string; email: string };
  const recipientMap = new Map<string, Recipient>();

  for (const reg of registrations) {
    recipientMap.set(reg.userId, {
      userId: reg.userId,
      name:
        [reg.user.firstName, reg.user.lastName].filter(Boolean).join(" ") ||
        reg.user.email,
      email: reg.user.email,
    });
  }
  for (const host of hosts) {
    if (!recipientMap.has(host.userId)) {
      recipientMap.set(host.userId, {
        userId: host.userId,
        name:
          [host.user.firstName, host.user.lastName]
            .filter(Boolean)
            .join(" ") || host.user.email,
        email: host.user.email,
      });
    }
  }

  // Exclut l'auteur du commentaire
  recipientMap.delete(commenterId);

  if (recipientMap.size === 0) return;

  // Batch fetch des préférences (évite le N+1)
  const recipientIds = [...recipientMap.keys()];
  const prefsMap =
    await prismaUserRepository.findNotificationPreferencesByIds(recipientIds);

  const emailStrings = {
    subject: t("commentNotification.subject", {
      playerName,
      momentTitle: moment.title,
    }),
    heading: t("commentNotification.heading"),
    message: t("commentNotification.message", {
      playerName,
      momentTitle: moment.title,
    }),
    commentPreviewLabel: t("commentNotification.commentPreviewLabel"),
    viewCommentCta: t("commentNotification.viewCommentCta"),
    footer: t("common.footer"),
  };

  await Promise.all(
    [...recipientMap.values()].map(async (recipient) => {
      const prefs = prefsMap.get(recipient.userId);
      if (!prefs?.notifyNewComment) return;

      return emailService.sendNewComment({
        to: recipient.email,
        recipientName: recipient.name,
        playerName,
        momentTitle: moment.title,
        momentSlug: moment.slug,
        commentPreview,
        strings: emailStrings,
      });
    })
  );

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  await notifySlackNewComment({
    playerName,
    momentTitle: moment.title,
    commentPreview,
    momentUrl: `${baseUrl}/m/${moment.slug}`,
  });
}
